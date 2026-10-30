import { asc, eq, notExists } from 'drizzle-orm';
import { nextColor, PLAYER_COLORS } from '#lib/colors.js';
import { avatarUrl, NAME_MAX_LENGTH, type PlayerSummary } from '#lib/players.js';
import { db, schema } from './db/index.js';

const { players, devices } = schema;

/** Columns needed for a PlayerSummary; selecting these keeps avatar bytes out of queries. */
export const summaryColumns = {
	id: players.id,
	name: players.name,
	color: players.color,
	avatarUpdatedAt: players.avatarUpdatedAt
};

export function toSummary(row: {
	id: string;
	name: string;
	color: string;
	avatarUpdatedAt: Date | null;
}): PlayerSummary {
	return { id: row.id, name: row.name, color: row.color, avatarUrl: avatarUrl(row.id, row.avatarUpdatedAt) };
}

export async function listPlayers(): Promise<PlayerSummary[]> {
	const rows = await db.select(summaryColumns).from(players).orderBy(asc(players.name));
	return rows.map(toSummary);
}

/** Returns the cleaned name, or an error message. */
export function validateName(raw: FormDataEntryValue | null): { name: string } | { error: string } {
	const name = String(raw ?? '')
		.trim()
		.replace(/\s+/g, ' ');
	if (!name) return { error: 'Please enter a name' };
	if (name.length > NAME_MAX_LENGTH) return { error: `Keep it under ${NAME_MAX_LENGTH} characters` };
	return { name };
}

export function validateColor(raw: FormDataEntryValue | null): string {
	const color = String(raw ?? '');
	return PLAYER_COLORS.includes(color) ? color : PLAYER_COLORS[0];
}

/** Postgres unique-violation, e.g. a name that is already taken. Drizzle wraps it in `cause`. */
export function isUniqueViolation(err: unknown): boolean {
	if (typeof err !== 'object' || err === null) return false;
	if ('code' in err && err.code === '23505') return true;
	return 'cause' in err && isUniqueViolation(err.cause);
}

/**
 * Adds someone who hasn't joined yet (e.g. from the paper records), with no device linked.
 * When they join, they pick their name on /welcome and get the history with it.
 */
export async function addPlayer(
	raw: FormDataEntryValue | null
): Promise<{ player: PlayerSummary } | { error: string }> {
	const result = validateName(raw);
	if ('error' in result) return result;

	const used = await db.select({ color: players.color }).from(players);
	try {
		const [row] = await db
			.insert(players)
			.values({ name: result.name, color: nextColor(used.map((p) => p.color)) })
			.returning(summaryColumns);
		return { player: toSummary(row) };
	} catch (err) {
		if (isUniqueViolation(err)) return { error: `${result.name} is already in the list` };
		throw err;
	}
}

/** Ids of players no phone has picked yet. */
export async function notJoinedIds(): Promise<string[]> {
	const rows = await db
		.select({ id: players.id })
		.from(players)
		.where(
			notExists(db.select({ id: devices.id }).from(devices).where(eq(devices.playerId, players.id)))
		);
	return rows.map((r) => r.id);
}
