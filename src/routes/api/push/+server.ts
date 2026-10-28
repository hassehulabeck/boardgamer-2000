import { error, json } from '@sveltejs/kit';
import { removeSubscription, saveSubscription } from '#lib/server/push.js';
import type { RequestHandler } from './$types';

/** Turns notifications on for this phone. Body: `PushSubscription.toJSON()`. */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.deviceId || !locals.player) error(401);
	if (!(await saveSubscription(locals.deviceId, await request.json().catch(() => null)))) {
		error(400, 'Invalid subscription');
	}
	return json({ ok: true });
};

/** Turns them off. Body: `{ endpoint }`. */
export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.deviceId) error(401);
	const { endpoint } = await request.json().catch(() => ({}));
	if (typeof endpoint === 'string') await removeSubscription(locals.deviceId, endpoint);
	return json({ ok: true });
};
