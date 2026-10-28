import { and, desc, eq, gt, inArray, lt, ne, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { dayKey, stockholmTime } from '#lib/format.js';
import {
	DRAFT_TTL_MS,
	DUPLICATE_WINDOW_MS,
	type SessionDetail,
	type SessionPlayer
} from '#lib/sessions.js';
import { db, schema } from './db/index.js';
import { gameSummaryColumns, toGameSummary } from './games.js';
import { summaryColumns as playerColumns, toSummary as toPlayerSummary } from './players.js';

const { sessions, sessionPlayers, games, players } = schema;
const creator = alias(players, 'creator');
const editor = alias(players, 'editor');

const MAX_SCORE = 1_000_000;
const MAX_LENGTH_MS = 12 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------------------------
// Cleanup

let lastCleanup = 0;

/** Deletes drafts nobody started within an hour. Runs lazily, at most once a minute. */
export async function cleanupStaleDrafts() {
	if (Date.now() - lastCleanup < 60_000) return;
	lastCleanup = Date.now();
	await db
		.delete(sessions)
		.where(and(eq(sessions.status, 'draft'), lt(sessions.createdAt, new Date(Date.now() - DRAFT_TTL_MS))));
}

// ---------------------------------------------------------------------------------------------
// Reading

/** Sessions matching `where`, newest first, with game and players filled in. */
async function loadSessions(where: SQL | undefined, limit = 100): Promise<SessionDetail[]> {
	await cleanupStaleDrafts();
	const rows = await db
		.select({
			id: sessions.id,
			status: sessions.status,
			startingPlayerId: sessions.startingPlayerId,
			createdAt: sessions.createdAt,
			startedAt: sessions.startedAt,
			endedAt: sessions.endedAt,
			updatedAt: sessions.updatedAt,
			createdByName: creator.name,
			updatedByName: editor.name,
			game: gameSummaryColumns
		})
		.from(sessions)
		.innerJoin(games, eq(games.id, sessions.gameId))
		.leftJoin(creator, eq(creator.id, sessions.createdBy))
		.leftJoin(editor, eq(editor.id, sessions.updatedBy))
		.where(where)
		.orderBy(desc(sql`coalesce(${sessions.startedAt}, ${sessions.createdAt})`))
		.limit(limit);
	if (rows.length === 0) return [];

	const playerRows = await db
		.select({
			sessionId: sessionPlayers.sessionId,
			score: sessionPlayers.score,
			isWinner: sessionPlayers.isWinner,
			player: playerColumns
		})
		.from(sessionPlayers)
		.innerJoin(players, eq(players.id, sessionPlayers.playerId))
		.where(
			inArray(
				sessionPlayers.sessionId,
				rows.map((r) => r.id)
			)
		);

	const bySession = new Map<string, SessionPlayer[]>();
	for (const row of playerRows) {
		const list = bySession.get(row.sessionId) ?? [];
		list.push({ ...toPlayerSummary(row.player), score: row.score, isWinner: row.isWinner });
		bySession.set(row.sessionId, list);
	}

	return rows.map((row) => ({
		...row,
		game: toGameSummary(row.game),
		players: (bySession.get(row.id) ?? []).sort(
			(a, b) =>
				Number(b.isWinner) - Number(a.isWinner) ||
				(b.score ?? -Infinity) - (a.score ?? -Infinity) ||
				a.name.localeCompare(b.name)
		)
	}));
}

export async function getSession(id: string): Promise<SessionDetail | null> {
	const [session] = await loadSessions(eq(sessions.id, id), 1);
	return session ?? null;
}

/** Drafts and games in progress. */
export function listActiveSessions(): Promise<SessionDetail[]> {
	return loadSessions(inArray(sessions.status, ['draft', 'playing']));
}

export function listFinishedSessions(limit = 100): Promise<SessionDetail[]> {
	return loadSessions(eq(sessions.status, 'finished'), limit);
}

// ---------------------------------------------------------------------------------------------
// Creating

/**
 * Someone else's draft or running game, created in the last few minutes, that includes any of
 * these players. Used to stop two people from logging the same game.
 */
export async function findDuplicate(playerIds: string[], me: string) {
	const [row] = await db
		.select({ id: sessions.id, gameTitle: games.title, createdByName: creator.name })
		.from(sessions)
		.innerJoin(games, eq(games.id, sessions.gameId))
		.leftJoin(creator, eq(creator.id, sessions.createdBy))
		.where(
			and(
				inArray(sessions.status, ['draft', 'playing']),
				gt(sessions.createdAt, new Date(Date.now() - DUPLICATE_WINDOW_MS)),
				ne(sessions.createdBy, me),
				sql`exists (select 1 from ${sessionPlayers} where ${sessionPlayers.sessionId} = ${sessions.id}
					and ${inArray(sessionPlayers.playerId, playerIds)})`
			)
		)
		.orderBy(desc(sessions.createdAt))
		.limit(1);
	return row ?? null;
}

/** Reads and checks the chosen game and players. */
export async function readSetupForm(
	form: FormData
): Promise<{ gameId: string; playerIds: string[] } | { error: string }> {
	const gameId = String(form.get('gameId') ?? '');
	const playerIds = [...new Set(form.getAll('playerId').map(String))];
	if (!gameId) return { error: 'Pick a game' };
	if (playerIds.length === 0) return { error: 'Pick at least one player' };

	const [game] = await db.select({ id: games.id }).from(games).where(eq(games.id, gameId));
	if (!game) return { error: 'That game no longer exists' };
	const found = await db
		.select({ id: players.id })
		.from(players)
		.where(inArray(players.id, playerIds));
	if (found.length !== playerIds.length) return { error: 'Some of those players no longer exist' };

	return { gameId, playerIds };
}

export async function createSession(gameId: string, playerIds: string[], createdBy: string) {
	return db.transaction(async (tx) => {
		const [session] = await tx
			.insert(sessions)
			.values({ gameId, createdBy })
			.returning({ id: sessions.id });
		await tx
			.insert(sessionPlayers)
			.values(playerIds.map((playerId) => ({ sessionId: session.id, playerId })));
		return session.id;
	});
}

/** Changes game and players before the game has started. */
export async function updateSetup(id: string, gameId: string, playerIds: string[]) {
	await db.transaction(async (tx) => {
		const [session] = await tx
			.update(sessions)
			.set({ gameId, updatedAt: new Date() })
			.where(and(eq(sessions.id, id), eq(sessions.status, 'draft')))
			.returning({ id: sessions.id });
		if (!session) return;
		await tx.delete(sessionPlayers).where(eq(sessionPlayers.sessionId, id));
		await tx.insert(sessionPlayers).values(playerIds.map((playerId) => ({ sessionId: id, playerId })));
	});
}

// ---------------------------------------------------------------------------------------------
// Playing

/** Starts the clock. Does nothing if someone else already started it. */
export async function startSession(id: string, startingPlayerId: string | null) {
	if (startingPlayerId) {
		const [inSession] = await db
			.select({ id: sessionPlayers.playerId })
			.from(sessionPlayers)
			.where(and(eq(sessionPlayers.sessionId, id), eq(sessionPlayers.playerId, startingPlayerId)));
		if (!inSession) startingPlayerId = null;
	}
	const now = new Date();
	await db
		.update(sessions)
		.set({ status: 'playing', startingPlayerId, startedAt: now, updatedAt: now })
		.where(and(eq(sessions.id, id), eq(sessions.status, 'draft')));
}

type ResultInput = {
	scores: Map<string, number | null>;
	winners: Set<string>;
	startedAt: Date;
	endedAt: Date;
};

/**
 * Reads the finish/edit form: a score and winner checkbox per player, "nobody won", and start
 * and end times (Swedish time on the day the game started).
 */
export function readResultForm(
	form: FormData,
	session: SessionDetail
): ResultInput | { error: string } {
	const playerIds = new Set(session.players.map((p) => p.id));

	const scores = new Map<string, number | null>();
	for (const id of playerIds) {
		const raw = String(form.get(`score:${id}`) ?? '').trim();
		if (!raw) {
			scores.set(id, null);
			continue;
		}
		const score = Number(raw);
		if (!Number.isInteger(score) || Math.abs(score) > MAX_SCORE) {
			return { error: 'Scores must be whole numbers' };
		}
		scores.set(id, score);
	}

	const nobodyWon = form.has('nobodyWon');
	const winners = new Set(
		nobodyWon ? [] : form.getAll('winner').map(String).filter((id) => playerIds.has(id))
	);
	if (!nobodyWon && winners.size === 0) {
		return { error: 'Mark who won, or tick "Nobody won"' };
	}

	const day = dayKey(session.startedAt ?? session.createdAt);
	const startedAt = stockholmTime(day, String(form.get('start') ?? ''));
	const endedAt = stockholmTime(day, String(form.get('end') ?? ''));
	if (!startedAt || !endedAt) return { error: 'Please enter start and end times' };
	if (endedAt <= startedAt) return { error: 'The end time must be after the start time' };
	if (endedAt.getTime() - startedAt.getTime() > MAX_LENGTH_MS) {
		return { error: 'That game seems too long. Check the times.' };
	}
	if (endedAt.getTime() > Date.now() + 5 * 60 * 1000) {
		return { error: "The end time can't be in the future" };
	}

	return { scores, winners, startedAt, endedAt };
}

/**
 * Saves a result: finishes a running game, or edits a finished one. Edits record who made
 * them; finishing a game does not count as an edit.
 */
export async function saveResult(session: SessionDetail, input: ResultInput, by: string) {
	const isEdit = session.status === 'finished';
	await db.transaction(async (tx) => {
		for (const player of session.players) {
			await tx
				.update(sessionPlayers)
				.set({ score: input.scores.get(player.id) ?? null, isWinner: input.winners.has(player.id) })
				.where(and(eq(sessionPlayers.sessionId, session.id), eq(sessionPlayers.playerId, player.id)));
		}
		await tx
			.update(sessions)
			.set({
				status: 'finished',
				startedAt: input.startedAt,
				endedAt: input.endedAt,
				updatedAt: new Date(),
				...(isEdit ? { updatedBy: by } : {})
			})
			.where(eq(sessions.id, session.id));
	});
}

export async function deleteSession(id: string) {
	await db.delete(sessions).where(eq(sessions.id, id));
}
