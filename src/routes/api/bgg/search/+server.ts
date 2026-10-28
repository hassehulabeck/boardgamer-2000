import { error, json } from '@sveltejs/kit';
import { BggError, bggEnabled, searchBgg } from '#lib/server/bgg.js';
import type { RequestHandler } from './$types';

/** `?q=catan` → up to 8 likely matches. */
export const GET: RequestHandler = async ({ url }) => {
	if (!bggEnabled) error(503, 'BoardGameGeek lookup is not set up');
	const query = url.searchParams.get('q')?.trim() ?? '';
	if (query.length < 2) return json([]);
	try {
		return json(await searchBgg(query.slice(0, 100)));
	} catch (err) {
		if (err instanceof BggError) error(502, err.message);
		throw err;
	}
};
