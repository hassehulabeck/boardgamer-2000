import { BGG_TOKEN } from '$app/env/private';
import type { BggThing } from '#lib/games.js';
import { parseSearch, parseThings } from './bggXml.js';

const API = 'https://boardgamegeek.com/xmlapi2';
/** BGG pictures are a few hundred KB; anything far bigger isn't one. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_HOST = /(^|\.)geekdo-images\.com$/;

/** Picture lookup needs a registered BGG app token; without one the buttons are hidden. */
export const bggEnabled = Boolean(BGG_TOKEN);

export class BggError extends Error {}

async function get(path: string): Promise<string> {
	let response: Response;
	try {
		response = await fetch(`${API}${path}`, {
			headers: { authorization: `Bearer ${BGG_TOKEN}` },
			signal: AbortSignal.timeout(10_000)
		});
	} catch {
		throw new BggError("Couldn't reach BoardGameGeek. Try again in a moment.");
	}
	if (response.status === 429) throw new BggError('BoardGameGeek is busy. Try again in a minute.');
	if (!response.ok) {
		console.error('BGG', path, response.status);
		throw new BggError("BoardGameGeek didn't answer. Try again later.");
	}
	return response.text();
}

/**
 * Board games matching a title, best guess first: exact title matches, then the most rated.
 * Looks the hits up again to get their thumbnails and rating counts.
 */
export async function searchBgg(query: string): Promise<BggThing[]> {
	const hits = parseSearch(await get(`/search?type=boardgame&query=${encodeURIComponent(query)}`));
	if (hits.length === 0) return [];
	const q = query.trim().toLowerCase();
	const ids = hits
		.sort((a, b) => Number(b.name.toLowerCase() === q) - Number(a.name.toLowerCase() === q))
		.slice(0, 20) // the most ids one thing request accepts
		.map((hit) => hit.id);
	const things = parseThings(await get(`/thing?stats=1&id=${ids.join(',')}`));
	return things
		.sort(
			(a, b) =>
				Number(b.name.toLowerCase() === q) - Number(a.name.toLowerCase() === q) ||
				b.ratings - a.ratings
		)
		.slice(0, 8);
}

/** The full-size box picture of a BGG game, for the phone to resize. */
export async function fetchBggImage(id: number): Promise<{ data: ArrayBuffer; type: string }> {
	const [thing] = parseThings(await get(`/thing?id=${id}`));
	if (!thing?.image) throw new BggError('That game has no picture on BoardGameGeek');
	const url = new URL(thing.image);
	// Only BGG's own image host: the URL comes from their API, but never fetch just anything.
	if (url.protocol !== 'https:' || !IMAGE_HOST.test(url.hostname)) {
		throw new BggError('That game has no picture on BoardGameGeek');
	}
	const response = await fetch(url, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
	const type = response?.headers.get('content-type') ?? '';
	if (!response?.ok || !type.startsWith('image/')) throw new BggError("Couldn't download the picture");
	if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) {
		throw new BggError('That picture is too large');
	}
	const data = await response.arrayBuffer();
	if (data.byteLength > MAX_IMAGE_BYTES) throw new BggError('That picture is too large');
	return { data, type };
}
