import { error, json } from '@sveltejs/kit';
import { sendPush } from '#lib/server/push.js';
import type { RequestHandler } from './$types';

/** Sends a test notification to this phone only. */
export const POST: RequestHandler = async ({ locals, url }) => {
	if (!locals.deviceId || !locals.player) error(401);
	await sendPush(
		{ deviceId: locals.deviceId },
		{ title: 'It works! 🎲', body: `You'll hear when people are in for lunch games.`, url: '/' },
		url.origin
	);
	return json({ ok: true });
};
