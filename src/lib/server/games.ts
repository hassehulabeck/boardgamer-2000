import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import { gameImageUrl, TITLE_MAX_LENGTH, type GameListItem, type GameSummary } from '#lib/games.js';
import { db, schema } from './db/index.js';
import { readImage } from './images.js';

const { games, sessions } = schema;

/** Columns needed for a GameSummary; selecting these keeps image bytes out of queries. */
export const gameSummaryColumns = {
	id: games.id,
	title: games.title,
	imageUpdatedAt: games.imageUpdatedAt,
	bggUrl: games.bggUrl
};

export function toGameSummary(row: {
	id: string;
	title: string;
	imageUpdatedAt: Date | null;
	bggUrl: string | null;
}): GameSummary {
	return {
		id: row.id,
		title: row.title,
		imageUrl: gameImageUrl(row.id, row.imageUpdatedAt),
		bggUrl: row.bggUrl
	};
}

/** All games, most played first. */
export async function listGames(): Promise<GameListItem[]> {
	const plays = sql<number>`count(${sessions.id})::int`;
	const rows = await db
		.select({ ...gameSummaryColumns, plays })
		.from(games)
		.leftJoin(sessions, and(eq(sessions.gameId, games.id), eq(sessions.status, 'finished')))
		.groupBy(games.id)
		.orderBy(desc(plays), asc(sql`lower(${games.title})`));
	return rows.map((row) => ({ ...toGameSummary(row), plays: row.plays }));
}

export async function countSessions(gameId: string): Promise<number> {
	const [{ n }] = await db.select({ n: count() }).from(sessions).where(eq(sessions.gameId, gameId));
	return n;
}

export async function getGame(id: string): Promise<GameSummary | null> {
	const [row] = await db.select(gameSummaryColumns).from(games).where(eq(games.id, id));
	return row ? toGameSummary(row) : null;
}

type GameInput = {
	title: string;
	bggUrl: string | null;
	/** New image bytes; null means the form asked to remove it; undefined means unchanged. */
	image?: Buffer | null;
};

/** Validates the shared add/edit game form. */
export async function readGameForm(form: FormData): Promise<GameInput | { error: string }> {
	const title = String(form.get('title') ?? '')
		.trim()
		.replace(/\s+/g, ' ');
	if (!title) return { error: 'Please enter a title' };
	if (title.length > TITLE_MAX_LENGTH) return { error: `Keep the title under ${TITLE_MAX_LENGTH} characters` };

	const bgg = normalizeBggUrl(form.get('bggUrl'));
	if (bgg === false) return { error: 'That doesn\'t look like a BoardGameGeek link' };

	const image = await readImage(form.get('image'));
	if (image && 'error' in image) return { error: image.error };

	return {
		title,
		bggUrl: bgg,
		image: image ? image.data : form.has('removeImage') ? null : undefined
	};
}

/** Accepts links with or without https:// and www. Returns null if empty, false if invalid. */
function normalizeBggUrl(raw: FormDataEntryValue | null): string | null | false {
	const value = String(raw ?? '').trim();
	if (!value) return null;
	try {
		const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
		const host = url.hostname.toLowerCase();
		if (host !== 'boardgamegeek.com' && !host.endsWith('.boardgamegeek.com')) return false;
		url.protocol = 'https:';
		return url.toString();
	} catch {
		return false;
	}
}

export function imageChange(image: Buffer | null | undefined, now: Date) {
	if (image === undefined) return {};
	return image ? { image, imageUpdatedAt: now } : { image: null, imageUpdatedAt: null };
}
