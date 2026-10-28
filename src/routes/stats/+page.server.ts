import { overviewStats } from '#lib/server/stats.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { stats: await overviewStats() };
};
