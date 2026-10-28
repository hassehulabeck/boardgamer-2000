import { fail, redirect } from '@sveltejs/kit';
import { count } from 'drizzle-orm';
import { LUNCH_SLOTS } from '#lib/availability.js';
import { listToday, setSlot } from '#lib/server/availability.js';
import { db, schema } from '#lib/server/db/index.js';
import { listPlayers } from '#lib/server/players.js';
import { notifyLunchJoin } from '#lib/server/push.js';
import { listActiveSessions } from '#lib/server/sessions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [players, active, lunch, [{ gameCount }]] = await Promise.all([
		listPlayers(),
		listActiveSessions(),
		listToday(),
		db.select({ gameCount: count() }).from(schema.games)
	]);
	return { players, active, lunch, gameCount };
};

export const actions: Actions = {
	/** Joins a lunch slot today; an empty slot means "I'm not coming after all". */
	lunch: async ({ request, locals, url }) => {
		const me = locals.player;
		if (!me) redirect(303, '/welcome');
		const slot = String((await request.formData()).get('slot') ?? '');
		if (slot && !LUNCH_SLOTS.includes(slot)) return fail(400, { error: 'Pick one of the lunch times' });
		await setSlot(me.id, slot || null);

		if (slot) {
			const inSlot = (await listToday()).find((s) => s.slot === slot)?.players ?? [];
			// Not awaited: pushes can take a moment and the tap should feel instant.
			void notifyLunchJoin(me, slot, inSlot, url.origin);
		}
		return { lunchSaved: true };
	}
};
