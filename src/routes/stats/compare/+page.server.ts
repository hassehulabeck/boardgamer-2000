import { COMPARE_MAX_PLAYERS } from '#lib/players.js';
import { listPlayers } from '#lib/server/players.js';
import { compareStats } from '#lib/server/stats.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const selected = [...new Set(url.searchParams.getAll('playerId'))].slice(0, COMPARE_MAX_PLAYERS);
	const exact = url.searchParams.get('exact') === '1';
	const [players, compare] = await Promise.all([
		listPlayers(),
		selected.length >= 2 ? compareStats(selected, exact) : null
	]);
	return { players, selected, exact, compare };
};
