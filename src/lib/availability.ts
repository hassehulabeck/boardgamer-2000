import type { PlayerSummary } from './players.js';

/** Lunch starts somewhere between 11:30 and 12:30, in 15-minute steps. */
export const LUNCH_SLOTS = ['11:30', '11:45', '12:00', '12:15', '12:30'];

/** A slot with this many people means a game is on, and the whole group hears about it. */
export const GAME_ON_COUNT = 3;

export type SlotList = { slot: string; players: PlayerSummary[] }[];

/** How far ahead people can sign up for lunch, in calendar days (today included). */
export const BOOKING_DAYS = 14;

/** A day in the picker: how many are coming, and whether you are. */
export type LunchDay = { day: string; count: number; mine: boolean };

/**
 * The workdays you can sign up for, as "2026-11-20" keys: today (if it's a weekday) and on
 * through the next fortnight. Works on plain calendar dates, so summer time can't shift them.
 */
export function bookableDays(today: string): string[] {
	const start = Date.parse(`${today}T00:00:00Z`);
	const days: string[] = [];
	for (let i = 0; i < BOOKING_DAYS; i++) {
		const date = new Date(start + i * 86_400_000);
		const weekday = date.getUTCDay();
		if (weekday !== 0 && weekday !== 6) days.push(date.toISOString().slice(0, 10));
	}
	return days;
}
