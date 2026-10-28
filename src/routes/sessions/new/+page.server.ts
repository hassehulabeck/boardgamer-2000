import { fail, redirect } from '@sveltejs/kit';
import { listGames } from '#lib/server/games.js';
import { listPlayers } from '#lib/server/players.js';
import { createSession, findDuplicate, readSetupForm } from '#lib/server/sessions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [games, players] = await Promise.all([listGames(), listPlayers()]);
	return { games, players };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const me = locals.player;
		if (!me) redirect(303, '/welcome');
		const form = await request.formData();
		const setup = await readSetupForm(form);
		if ('error' in setup) return fail(400, { error: setup.error });

		if (!form.has('force')) {
			const duplicate = await findDuplicate(setup.playerIds, me.id);
			if (duplicate) return fail(409, { duplicate });
		}

		const id = await createSession(setup.gameId, setup.playerIds, me.id);
		redirect(303, `/sessions/${id}`);
	}
};
