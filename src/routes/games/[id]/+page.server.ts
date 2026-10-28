import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { countSessions, getGame, imageChange, readGameForm } from '#lib/server/games.js';
import { isUuid } from '#lib/server/images.js';
import { isUniqueViolation } from '#lib/server/players.js';
import type { Actions, PageServerLoad } from './$types';

const { games } = schema;

export const load: PageServerLoad = async ({ params }) => {
	const game = isUuid(params.id) ? await getGame(params.id) : null;
	if (!game) error(404, 'Game not found');
	return { game };
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const input = await readGameForm(await request.formData());
		if ('error' in input) return fail(400, { error: input.error });

		const now = new Date();
		try {
			await db
				.update(games)
				.set({ title: input.title, bggUrl: input.bggUrl, updatedAt: now, ...imageChange(input.image, now) })
				.where(eq(games.id, params.id));
		} catch (err) {
			if (isUniqueViolation(err)) return fail(400, { error: `${input.title} is already in the list` });
			throw err;
		}
		return { saved: true };
	},

	delete: async ({ params }) => {
		// Keep the stats: a game that has been played can't be deleted.
		const sessions = await countSessions(params.id);
		if (sessions > 0) {
			return fail(400, {
				deleteError: `This game is in ${sessions === 1 ? '1 session' : `${sessions} sessions`}, so it can't be deleted.`
			});
		}
		await db.delete(games).where(eq(games.id, params.id));
		redirect(303, '/games');
	}
};
