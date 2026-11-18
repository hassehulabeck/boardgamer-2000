import { fail, redirect } from '@sveltejs/kit';
import { count } from 'drizzle-orm';
import { bookableDays, LUNCH_SLOTS } from '#lib/availability.js';
import { dayKey } from '#lib/format.js';
import { listDay, lunchDays, setSlot } from '#lib/server/availability.js';
import { db, schema } from '#lib/server/db/index.js';
import { feedbackEnabled } from '#lib/server/feedback.js';
import { listPlayers } from '#lib/server/players.js';
import { notifyLunchJoin } from '#lib/server/push.js';
import { listActiveSessions } from '#lib/server/sessions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const today = dayKey(new Date());
	const days = bookableDays(today);
	// An old link (or a home-screen app left open since last week) just shows the first day.
	const asked = url.searchParams.get('day');
	const day = asked && days.includes(asked) ? asked : days[0];

	const [players, active, lunch, lunchDayList, [{ gameCount }]] = await Promise.all([
		listPlayers(),
		listActiveSessions(),
		listDay(day),
		lunchDays(days, locals.player?.id ?? null),
		db.select({ gameCount: count() }).from(schema.games)
	]);
	return {
		players,
		active,
		lunch,
		lunchDay: day,
		lunchDays: lunchDayList,
		today,
		gameCount,
		feedback: feedbackEnabled
	};
};

export const actions: Actions = {
	/** Joins a lunch slot on a day; an empty slot means "I'm not coming after all". */
	lunch: async ({ request, locals, url }) => {
		const me = locals.player;
		if (!me) redirect(303, '/welcome');
		const form = await request.formData();
		const day = String(form.get('day') ?? '');
		const slot = String(form.get('slot') ?? '');
		if (!bookableDays(dayKey(new Date())).includes(day)) {
			return fail(400, { error: 'Pick a weekday in the next two weeks' });
		}
		if (slot && !LUNCH_SLOTS.includes(slot)) return fail(400, { error: 'Pick one of the lunch times' });
		await setSlot(me.id, day, slot || null);

		if (slot) {
			const inSlot = (await listDay(day)).find((s) => s.slot === slot)?.players ?? [];
			// Not awaited: pushes can take a moment and the tap should feel instant.
			void notifyLunchJoin(me, day, slot, inSlot, url.origin);
		}
		return { lunchSaved: true };
	}
};
