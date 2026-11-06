import { error, json } from '@sveltejs/kit';
import { addPlayer } from '#lib/server/players.js';
import type { RequestHandler } from './$types';

/** Adds someone who hasn't joined yet. Body: `{ name }`. */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.player) error(401);
	const { name } = await request.json().catch(() => ({}));
	const result = await addPlayer(typeof name === 'string' ? name : null);
	if ('error' in result) return json({ error: result.error }, { status: 400 });
	return json({ player: result.player });
};
