import { error } from '@sveltejs/kit';
import { getGame } from '#lib/server/games.js';
import { isUuid } from '#lib/server/images.js';
import { gameStats } from '#lib/server/stats.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const game = isUuid(params.id) ? await getGame(params.id) : null;
	if (!game) error(404, 'Game not found');
	return { game, stats: await gameStats(game.id) };
};
