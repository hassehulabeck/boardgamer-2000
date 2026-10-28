import { fail, redirect } from '@sveltejs/kit';
import { checkGroupCode, createDevice } from '#lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.deviceId) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		if (!checkGroupCode(form.get('code'))) {
			// A small delay makes guessing the code tedious.
			await new Promise((r) => setTimeout(r, 750));
			return fail(400, { wrong: true });
		}
		await createDevice(cookies, request.headers.get('user-agent'));
		redirect(303, '/welcome');
	}
};
