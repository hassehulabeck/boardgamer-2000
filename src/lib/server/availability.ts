import { and, asc, eq } from 'drizzle-orm';
import { LUNCH_SLOTS, type SlotList } from '#lib/availability.js';
import { dayKey } from '#lib/format.js';
import { db, schema } from './db/index.js';
import { summaryColumns, toSummary } from './players.js';

const { availability, players } = schema;

/** Every lunch slot today, with who's coming then (earliest sign-up first). */
export async function listToday(): Promise<SlotList> {
	const rows = await db
		.select({ slot: availability.slot, player: summaryColumns })
		.from(availability)
		.innerJoin(players, eq(players.id, availability.playerId))
		.where(eq(availability.day, dayKey(new Date())))
		.orderBy(asc(availability.updatedAt));
	return LUNCH_SLOTS.map((slot) => ({
		slot,
		players: rows.filter((r) => r.slot === slot).map((r) => toSummary(r.player))
	}));
}

/** Puts a player in a slot today, moving them if they were in another. Null takes them off. */
export async function setSlot(playerId: string, slot: string | null) {
	const day = dayKey(new Date());
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
