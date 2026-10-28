import { error } from '@sveltejs/kit';
import { wrappedStats } from '#lib/server/stats.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const year = Number(params.year);
	if (!/^\d{4}$/.test(params.year)) error(404, 'No such year');
	return { wrapped: await wrappedStats(year, locals.player?.id ?? null) };
};
