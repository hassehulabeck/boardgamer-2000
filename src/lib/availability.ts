import type { PlayerSummary } from './players.js';

/** Lunch starts somewhere between 11:30 and 12:30, in 15-minute steps. */
export const LUNCH_SLOTS = ['11:30', '11:45', '12:00', '12:15', '12:30'];

/** A slot with this many people means a game is on, and the whole group hears about it. */
export const GAME_ON_COUNT = 3;

export type SlotList = { slot: string; players: PlayerSummary[] }[];
