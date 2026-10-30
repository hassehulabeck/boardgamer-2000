import { fail, redirect } from '@sveltejs/kit';
import { dayKey } from '#lib/format.js';
import { listGames } from '#lib/server/games.js';
import { addPlayer, listPlayers } from '#lib/server/players.js';
import { createPastSession, findPastDuplicate, readPastForm } from '#lib/server/sessions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [games, players] = await Promise.all([listGames(), listPlayers()]);
	// Alphabetical, not most-played: that order would shift after every save.
	games.sort((a, b) => a.title.localeCompare(b.title, 'sv'));
	return { games, players, today: dayKey(new Date()) };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		if (!locals.player) redirect(303, '/welcome');
		const form = await request.formData();
		const input = await readPastForm(form);
		if ('error' in input) return fail(400, { error: input.error });

		// Typing in a pile of paper records, the same line can easily be entered twice.
		if (!form.has('force')) {
			const duplicate = await findPastDuplicate(input);
			if (duplicate) return fail(409, { duplicate: { id: duplicate.id } });
		}

		const id = await createPastSession(input, locals.player.id);
		return { saved: { id, day: input.day, gameId: input.gameId } };
	},

	// People in the paper records who haven't joined the app yet.
	addPlayer: async ({ request, locals }) => {
		if (!locals.player) redirect(303, '/welcome');
		const result = await addPlayer((await request.formData()).get('name'));
		if ('error' in result) return fail(400, { addError: result.error });
		return { added: { id: result.player.id } };
	}
};
