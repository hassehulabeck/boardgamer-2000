import { fail, redirect } from '@sveltejs/kit';
import { count, eq } from 'drizzle-orm';
import { linkDevice } from '#lib/server/auth.js';
import { db, schema } from '#lib/server/db/index.js';
import { readImage } from '#lib/server/images.js';
import { vapidPublicKey } from '#lib/server/push.js';
import { isUniqueViolation, validateColor, validateName } from '#lib/server/players.js';
import type { Actions, PageServerLoad } from './$types';

const { players, devices } = schema;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.player) redirect(303, '/welcome');
	const [{ phones }] = await db
		.select({ phones: count() })
		.from(devices)
		.where(eq(devices.playerId, locals.player.id));
	return { phones, isNew: url.searchParams.has('new'), pushKey: vapidPublicKey };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		if (!locals.player) redirect(303, '/welcome');
		const form = await request.formData();

		const result = validateName(form.get('name'));
		if ('error' in result) return fail(400, { error: result.error });

		const image = await readImage(form.get('avatar'));
		if (image && 'error' in image) return fail(400, { error: image.error });

		const now = new Date();
		const avatarChange = image
			? { avatar: image.data, avatarUpdatedAt: now }
			: form.has('removeAvatar')
				? { avatar: null, avatarUpdatedAt: null }
				: {};

		try {
			await db
				.update(players)
				.set({ name: result.name, color: validateColor(form.get('color')), updatedAt: now, ...avatarChange })
				.where(eq(players.id, locals.player.id));
		} catch (err) {
			if (isUniqueViolation(err)) return fail(400, { error: `Someone is already called ${result.name}` });
			throw err;
		}
		return { saved: true };
	},

	forget: async ({ locals }) => {
		if (locals.deviceId) await linkDevice(locals.deviceId, null);
		redirect(303, '/welcome');
	}
};
