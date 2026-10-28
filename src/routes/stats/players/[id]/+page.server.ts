import { error } from '@sveltejs/kit';
import { isUuid } from '#lib/server/images.js';
import { playerStats } from '#lib/server/stats.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const stats = isUuid(params.id) ? await playerStats(params.id) : null;
	if (!stats) error(404, 'Player not found');
	return { stats };
};
