import type { GameSummary } from './games.js';
import type { PlayerSummary } from './players.js';

export type SessionStatus = 'draft' | 'playing' | 'finished';

/** A draft nobody starts within this time is deleted. */
export const DRAFT_TTL_MS = 60 * 60 * 1000;
/** A game still "playing" after this long is flagged as unfinished. */
export const UNFINISHED_AFTER_MS = 4 * 60 * 60 * 1000;
/** Someone else's session that includes you, created this recently, triggers the duplicate guard. */
export const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

export type SessionPlayer = PlayerSummary & { score: number | null; isWinner: boolean };

export type SessionDetail = {
	id: string;
	status: SessionStatus;
	game: GameSummary;
	/** Winners first, then by score (highest first), then by name. */
	players: SessionPlayer[];
	startingPlayerId: string | null;
	createdAt: Date;
	/** For a session logged afterwards without times: noon on the day it was played. */
	startedAt: Date | null;
	/** Null for a finished session means it was logged afterwards and the times are unknown. */
	endedAt: Date | null;
	createdByName: string | null;
	updatedByName: string | null;
	updatedAt: Date;
};

export function isUnfinished(session: Pick<SessionDetail, 'status' | 'startedAt'>, now = Date.now()) {
	return (
		session.status === 'playing' &&
		session.startedAt !== null &&
		now - session.startedAt.getTime() > UNFINISHED_AFTER_MS
	);
}

/** A finished session typed in afterwards (e.g. from paper), with a date but no times. */
export function hasNoTimes(session: Pick<SessionDetail, 'status' | 'endedAt'>) {
	return session.status === 'finished' && session.endedAt === null;
}
