import type { PlayerSummary } from './players.js';

/** Lunch starts somewhere between 11:30 and 12:30, in 15-minute steps. */
export const LUNCH_SLOTS = ['11:30', '11:45', '12:00', '12:15', '12:30'];

export type SlotList = { slot: string; players: PlayerSummary[] }[];
