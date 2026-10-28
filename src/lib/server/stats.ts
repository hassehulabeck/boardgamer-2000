// Stats are computed in memory from every finished session. The group logs a handful of games a
// week, so this stays small for years and keeps the rules readable in one place.
import { asc, eq, inArray } from 'drizzle-orm';
import { dayKey, weekdayIndex, WEEKDAYS } from '#lib/format.js';
import type { GameSummary } from '#lib/games.js';
import type { PlayerSummary } from '#lib/players.js';
import { db, schema } from './db/index.js';
import { gameSummaryColumns, toGameSummary } from './games.js';
import { listPlayers } from './players.js';

const { sessions, sessionPlayers, games } = schema;

type StatSession = {
	id: string;
	game: GameSummary;
	startedAt: Date;
	lengthMs: number;
	startingPlayerId: string | null;
	players: { id: string; score: number | null; isWinner: boolean }[];
};

type StatData = { sessions: StatSession[]; players: Map<string, PlayerSummary> };

/** Finished sessions, oldest first, plus every player. */
async function loadData(): Promise<StatData> {
	const [rows, playerRows, everyone] = await Promise.all([
		db
			.select({
				id: sessions.id,
				startedAt: sessions.startedAt,
				endedAt: sessions.endedAt,
				startingPlayerId: sessions.startingPlayerId,
				game: gameSummaryColumns
			})
			.from(sessions)
			.innerJoin(games, eq(games.id, sessions.gameId))
			.where(eq(sessions.status, 'finished'))
			.orderBy(asc(sessions.startedAt)),
		db
			.select({
				sessionId: sessionPlayers.sessionId,
				id: sessionPlayers.playerId,
				score: sessionPlayers.score,
				isWinner: sessionPlayers.isWinner
			})
			.from(sessionPlayers)
			.where(
				inArray(
					sessionPlayers.sessionId,
					db.select({ id: sessions.id }).from(sessions).where(eq(sessions.status, 'finished'))
				)
			),
		listPlayers()
	]);

	const bySession = new Map<string, StatSession['players']>();
	for (const { sessionId, ...player } of playerRows) {
		const list = bySession.get(sessionId) ?? [];
		list.push(player);
		bySession.set(sessionId, list);
	}

	return {
		sessions: rows.map((row) => ({
			id: row.id,
			game: toGameSummary(row.game),
			startedAt: row.startedAt!,
			lengthMs: row.endedAt!.getTime() - row.startedAt!.getTime(),
			startingPlayerId: row.startingPlayerId,
			players: bySession.get(row.id) ?? []
		})),
		players: new Map(everyone.map((p) => [p.id, p]))
	};
}

/** Counts per key, keeping the first value seen for each key. */
function tally<T>(items: Iterable<T>, key: (item: T) => string) {
	const counts = new Map<string, { item: T; count: number }>();
	for (const item of items) {
		const k = key(item);
		const entry = counts.get(k);
		if (entry) entry.count++;
		else counts.set(k, { item, count: 1 });
	}
	return [...counts.values()].sort((a, b) => b.count - a.count);
}

export type PlayerRecord = { player: PlayerSummary; plays: number; wins: number };

/** Plays and wins per player in these sessions, most wins first. */
function playerRecords(list: StatSession[], players: StatData['players']): PlayerRecord[] {
	const records = new Map<string, PlayerRecord>();
	for (const session of list) {
		for (const { id, isWinner } of session.players) {
			const player = players.get(id);
			if (!player) continue;
			const record = records.get(id) ?? { player, plays: 0, wins: 0 };
			record.plays++;
			if (isWinner) record.wins++;
			records.set(id, record);
		}
	}
	return [...records.values()].sort(
		(a, b) => b.wins - a.wins || b.wins / b.plays - a.wins / a.plays || a.player.name.localeCompare(b.player.name)
	);
}

export type GameRecord = { game: GameSummary; plays: number; totalMs: number };

function gameRecords(list: StatSession[]): GameRecord[] {
	const records = new Map<string, GameRecord>();
	for (const session of list) {
		const record = records.get(session.game.id) ?? { game: session.game, plays: 0, totalMs: 0 };
		record.plays++;
		record.totalMs += session.lengthMs;
		records.set(session.game.id, record);
	}
	return [...records.values()].sort((a, b) => b.plays - a.plays || a.game.title.localeCompare(b.game.title));
}

// ---------------------------------------------------------------------------------------------
// Overview

export type WeekdayStats = { day: string; sessions: number; topGames: { title: string; plays: number }[] };

export async function overviewStats() {
	const { sessions: list, players } = await loadData();

	const weekdays: WeekdayStats[] = WEEKDAYS.map((day, i) => {
		const onDay = list.filter((s) => weekdayIndex(s.startedAt) === i);
		return {
			day,
			sessions: onDay.length,
			topGames: tally(onDay, (s) => s.game.id)
				.slice(0, 3)
				.map(({ item, count }) => ({ title: item.game.title, plays: count }))
		};
	}).filter((w, i) => i < 5 || w.sessions > 0); // weekends only if someone played then

	return {
		sessions: list.length,
		totalMs: list.reduce((sum, s) => sum + s.lengthMs, 0),
		days: new Set(list.map((s) => dayKey(s.startedAt))).size,
		games: gameRecords(list),
		players: playerRecords(list, players),
		weekdays
	};
}

// ---------------------------------------------------------------------------------------------
// One game

export async function gameStats(gameId: string) {
	const data = await loadData();
	const list = data.sessions.filter((s) => s.game.id === gameId);

	let highScore: { player: PlayerSummary; score: number; date: Date } | null = null;
	for (const session of list) {
		for (const { id, score } of session.players) {
			const player = data.players.get(id);
			if (player && score !== null && (!highScore || score > highScore.score)) {
				highScore = { player, score, date: session.startedAt };
			}
		}
	}

	return {
		plays: list.length,
		averageMs: list.length ? list.reduce((sum, s) => sum + s.lengthMs, 0) / list.length : 0,
		shortestMs: list.length ? Math.min(...list.map((s) => s.lengthMs)) : 0,
		longestMs: list.length ? Math.max(...list.map((s) => s.lengthMs)) : 0,
		lastPlayed: list.at(-1)?.startedAt ?? null,
		players: playerRecords(list, data.players),
		highScore,
		startingPlayer: startingPlayerAdvantage(list)
	};
}

/**
 * How often the starting player won, against what pure chance would give (1 in 4 for a
 * four-player game, adjusted for shared wins). Only counts games where someone won.
 */
function startingPlayerAdvantage(list: StatSession[]) {
	const counted = list.filter(
		(s) => s.startingPlayerId && s.players.some((p) => p.isWinner) && s.players.length > 1
	);
	if (counted.length === 0) return null;
	const wins = counted.filter((s) =>
		s.players.some((p) => p.id === s.startingPlayerId && p.isWinner)
	).length;
	const expected =
		counted.reduce((sum, s) => sum + s.players.filter((p) => p.isWinner).length / s.players.length, 0) /
		counted.length;
	return { sessions: counted.length, wins, expected };
}

// ---------------------------------------------------------------------------------------------
// One player

export type HeadToHead = { opponent: PlayerSummary; together: number; myWins: number; theirWins: number };

export async function playerStats(playerId: string) {
	return summarizePlayer(await loadData(), playerId);
}

function summarizePlayer(data: StatData, playerId: string) {
	const player = data.players.get(playerId);
	if (!player) return null;
	const list = data.sessions.filter((s) => s.players.some((p) => p.id === playerId));
	const won = (s: StatSession, id = playerId) => s.players.some((p) => p.id === id && p.isWinner);

	// Win streaks, in the order the games were played.
	let current = 0;
	let best = 0;
	for (const session of list) {
		current = won(session) ? current + 1 : 0;
		best = Math.max(best, current);
	}

	const favorites = gameRecords(list).map((record) => ({
		...record,
		wins: list.filter((s) => s.game.id === record.game.id && won(s)).length
	}));

	const opponents = new Map<string, HeadToHead>();
	for (const session of list) {
		for (const { id } of session.players) {
			const opponent = data.players.get(id);
			if (id === playerId || !opponent) continue;
			const h2h = opponents.get(id) ?? { opponent, together: 0, myWins: 0, theirWins: 0 };
			h2h.together++;
			if (won(session)) h2h.myWins++;
			if (won(session, id)) h2h.theirWins++;
			opponents.set(id, h2h);
		}
	}

	const busiest = tally(list, (s) => String(weekdayIndex(s.startedAt)))[0];

	return {
		player,
		plays: list.length,
		wins: list.filter((s) => won(s)).length,
		totalMs: list.reduce((sum, s) => sum + s.lengthMs, 0),
		started: list.filter((s) => s.startingPlayerId === playerId).length,
		streaks: { current, best },
		favorites,
		headToHead: [...opponents.values()].sort(
			(a, b) => b.together - a.together || a.opponent.name.localeCompare(b.opponent.name)
		),
		favoriteDay: busiest ? WEEKDAYS[weekdayIndex(busiest.item.startedAt)] : null
	};
}

// ---------------------------------------------------------------------------------------------
// Wrapped: one year, for the group and for you

/** Calendar year in Swedish time, so New Year's Eve games land in the right year. */
const yearOf = (date: Date) => Number(dayKey(date).slice(0, 4));

export async function wrappedStats(year: number, meId: string | null) {
	const all = await loadData();
	const years = [...new Set(all.sessions.map((s) => yearOf(s.startedAt)))].sort();
	const data = { ...all, sessions: all.sessions.filter((s) => yearOf(s.startedAt) === year) };
	const list = data.sessions;
	if (list.length === 0) return { year, years, empty: true } as const;

	const players = playerRecords(list, data.players);
	const mostActive = [...players].sort((a, b) => b.plays - a.plays);
	const biggestDay = tally(list, (s) => dayKey(s.startedAt))[0];
	const busiestWeekday = tally(list, (s) => String(weekdayIndex(s.startedAt)))[0];
	const longest = list.reduce((a, b) => (b.lengthMs > a.lengthMs ? b : a));

	const me = meId ? summarizePlayer(data, meId) : null;
	const mine =
		me && me.plays > 0
			? {
					plays: me.plays,
					wins: me.wins,
					totalMs: me.totalMs,
					rank: mostActive.findIndex((r) => r.player.id === meId) + 1,
					bestStreak: me.streaks.best,
					topGame: me.favorites[0],
					sidekick: me.headToHead[0] ?? null,
					// The one who beat you most often, counting only games you both played.
					nemesis:
						me.headToHead
							.filter((h) => h.theirWins > h.myWins)
							.sort((a, b) => b.theirWins - b.myWins - (a.theirWins - a.myWins))[0] ?? null
				}
			: null;

	return {
		year,
		years,
		empty: false,
		sessions: list.length,
		totalMs: list.reduce((sum, s) => sum + s.lengthMs, 0),
		days: new Set(list.map((s) => dayKey(s.startedAt))).size,
		playerCount: players.length,
		topGames: gameRecords(list).slice(0, 3),
		champion: players[0],
		mostActive: mostActive[0],
		biggestDay: { date: biggestDay.item.startedAt, sessions: biggestDay.count },
		busiestWeekday: { day: WEEKDAYS[weekdayIndex(busiestWeekday.item.startedAt)], sessions: busiestWeekday.count },
		longest: { game: longest.game, lengthMs: longest.lengthMs, date: longest.startedAt },
		me: mine
	};
}
