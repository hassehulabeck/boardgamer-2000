import { fail, redirect } from '@sveltejs/kit';
import { bggEnabled } from '#lib/server/bgg.js';
import { db, schema } from '#lib/server/db/index.js';
import { imageChange, readGameForm } from '#lib/server/games.js';
import { isUniqueViolation } from '#lib/server/players.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ bgg: bggEnabled });

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const input = await readGameForm(await request.formData());
		if ('error' in input) return fail(400, { error: input.error });

		try {
			await db.insert(schema.games).values({
				title: input.title,
				bggUrl: input.bggUrl,
				createdBy: locals.player?.id,
				...imageChange(input.image, new Date())
			});
		} catch (err) {
			if (isUniqueViolation(err)) return fail(400, { error: `${input.title} is already in the list` });
			throw err;
		}
		redirect(303, '/games');
	}
};
