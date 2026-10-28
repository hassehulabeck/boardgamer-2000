import { asc } from 'drizzle-orm';
import { PLAYER_COLORS } from '#lib/colors.js';
import { avatarUrl, NAME_MAX_LENGTH, type PlayerSummary } from '#lib/players.js';
import { db, schema } from './db/index.js';

const { players } = schema;

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
