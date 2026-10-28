import { error, fail, redirect } from '@sveltejs/kit';
import { listGames } from '#lib/server/games.js';
import { isUuid } from '#lib/server/images.js';
import { listPlayers } from '#lib/server/players.js';
import {
	deleteSession,
	getSession,
	readResultForm,
	readSetupForm,
	saveResult,
	startSession,
	updateSetup
} from '#lib/server/sessions.js';
import type { Actions, PageServerLoad } from './$types';

async function requireSession(id: string) {
	const session = isUuid(id) ? await getSession(id) : null;
	if (!session) error(404, 'This session no longer exists');
	return session;
}

export const load: PageServerLoad = async ({ params }) => {
	const session = await requireSession(params.id);
	// Drafts can still change game and players.
	const [games, players] =
		session.status === 'draft' ? await Promise.all([listGames(), listPlayers()]) : [[], []];
	return { session, games, players };
};

export const actions: Actions = {
	setup: async ({ request, params }) => {
		const setup = await readSetupForm(await request.formData());
		if ('error' in setup) return fail(400, { setupError: setup.error });
		await updateSetup(params.id, setup.gameId, setup.playerIds);
		return { setupSaved: true };
	},

	start: async ({ request, params }) => {
		const form = await request.formData();
		const startingPlayerId = String(form.get('startingPlayerId') ?? '') || null;
		await startSession(params.id, startingPlayerId);
		redirect(303, `/sessions/${params.id}`);
	},

	result: async ({ request, params, locals }) => {
		if (!locals.player) redirect(303, '/welcome');
		const session = await requireSession(params.id);
		if (session.status === 'draft') return fail(400, { resultError: 'Start the game first' });
		const input = readResultForm(await request.formData(), session);
		if ('error' in input) return fail(400, { resultError: input.error });
		await saveResult(session, input, locals.player.id);
		return { resultSaved: true };
	},

	delete: async ({ params }) => {
		await deleteSession(params.id);
		redirect(303, '/sessions');
	}
};
