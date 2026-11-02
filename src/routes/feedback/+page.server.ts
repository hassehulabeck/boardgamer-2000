import { fail, redirect } from '@sveltejs/kit';
import {
	allowFeedback,
	FeedbackError,
	feedbackEnabled,
	submitFeedback,
	validateFeedback
} from '#lib/server/feedback.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { enabled: feedbackEnabled };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.player) redirect(303, '/welcome');
		if (!feedbackEnabled) return fail(400, { error: 'The suggestion box is closed for now' });

		const result = validateFeedback(await request.formData());
		if ('error' in result) return fail(400, { error: result.error });
		if (!allowFeedback(locals.player.id)) {
			return fail(429, { error: "That's a lot of suggestions! Wait a few minutes." });
		}

		try {
			const issue = await submitFeedback({
				...result,
				from: locals.player.name,
				userAgent: request.headers.get('user-agent')
			});
			return { sent: issue };
		} catch (err) {
			if (err instanceof FeedbackError) return fail(502, { error: err.message });
			throw err;
		}
	}
};
