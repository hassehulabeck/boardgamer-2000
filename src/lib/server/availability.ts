import { and, asc, between, eq } from 'drizzle-orm';
import { LUNCH_SLOTS, type LunchDay, type SlotList } from '#lib/availability.js';
import { db, schema } from './db/index.js';
import { summaryColumns, toSummary } from './players.js';

const { availability, players } = schema;

/** Every lunch slot on a day, with who's coming then (earliest sign-up first). */
export async function listDay(day: string): Promise<SlotList> {
	const rows = await db
		.select({ slot: availability.slot, player: summaryColumns })
		.from(availability)
		.innerJoin(players, eq(players.id, availability.playerId))
		.where(eq(availability.day, day))
		.orderBy(asc(availability.updatedAt));
	return LUNCH_SLOTS.map((slot) => ({
		slot,
		players: rows.filter((r) => r.slot === slot).map((r) => toSummary(r.player))
	}));
}

/** Head counts for the day picker. `days` must be in order. */
export async function lunchDays(days: string[], meId: string | null): Promise<LunchDay[]> {
	const rows = days.length
		? await db
				.select({ day: availability.day, playerId: availability.playerId })
				.from(availability)
				.where(between(availability.day, days[0], days[days.length - 1]))
		: [];
	return days.map((day) => {
		const on = rows.filter((r) => r.day === day);
		return { day, count: on.length, mine: on.some((r) => r.playerId === meId) };
	});
}

/** Puts a player in a slot on a day, moving them if they were in another. Null takes them off. */
export async function setSlot(playerId: string, day: string, slot: string | null) {
	if (slot === null) {
		await db
			.delete(availability)
			.where(and(eq(availability.day, day), eq(availability.playerId, playerId)));
		return;
	}
	await db
		.insert(availability)
		.values({ day, playerId, slot })
		.onConflictDoUpdate({
			target: [availability.day, availability.playerId],
			set: { slot, updatedAt: new Date() }
		});
}
