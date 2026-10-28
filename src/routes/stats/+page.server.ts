import { dayKey } from '#lib/format.js';
import { overviewStats } from '#lib/server/stats.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { stats: await overviewStats(), year: Number(dayKey(new Date()).slice(0, 4)) };
};
