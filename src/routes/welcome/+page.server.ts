import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { nextColor } from '#lib/colors.js';
import { linkDevice } from '#lib/server/auth.js';
import { db, schema } from '#lib/server/db/index.js';
import {
	isUniqueViolation,
	listPlayers,
	notJoinedIds,
	validateColor,
	validateName
} from '#lib/server/players.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.player) redirect(303, '/');
	const [players, notJoined] = await Promise.all([listPlayers(), notJoinedIds()]);
	return { players, notJoined, suggestedColor: nextColor(players.map((p) => p.color)) };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.deviceId) redirect(303, '/join');
		const form = await request.formData();
		const result = validateName(form.get('name'));
		if ('error' in result) return fail(400, { createError: result.error });

		try {
			const [player] = await db
				.insert(schema.players)
				.values({ name: result.name, color: validateColor(form.get('color')) })
				.returning({ id: schema.players.id });
			await linkDevice(locals.deviceId, player.id);
		} catch (err) {
			if (isUniqueViolation(err)) {
				return fail(400, {
					createError: `${result.name} is already in the list. Is that you? Pick it below.`
				});
			}
			throw err;
		}
		redirect(303, '/profile?new');
	},

	claim: async ({ request, locals }) => {
		if (!locals.deviceId) redirect(303, '/join');
		const form = await request.formData();
		const playerId = String(form.get('playerId') ?? '');
		const [player] = await db
			.select({ id: schema.players.id })
			.from(schema.players)
			.where(eq(schema.players.id, playerId));
		if (!player) return fail(404, { claimError: 'That profile no longer exists' });

		await linkDevice(locals.deviceId, player.id);
		redirect(303, '/');
	}
};
