import { error } from '@sveltejs/kit';
import { BggError, bggEnabled, fetchBggImage } from '#lib/server/bgg.js';
import type { RequestHandler } from './$types';

/**
 * The game's box picture, passed through our server: BGG's image host doesn't allow the
 * cross-origin reads the phone needs to resize it.
 */
export const GET: RequestHandler = async ({ params }) => {
	if (!bggEnabled) error(503, 'BoardGameGeek lookup is not set up');
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(404);
	try {
		const { data, type } = await fetchBggImage(id);
		return new Response(data, { headers: { 'content-type': type, 'cache-control': 'private, max-age=86400' } });
	} catch (err) {
		if (err instanceof BggError) error(502, err.message);
		throw err;
	}
};
