import { listGames } from '#lib/server/games.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { games: await listGames() };
};
