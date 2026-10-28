import type { Handle } from '@sveltejs/kit/hooks';
import { loadDevice } from '#lib/server/auth.js';

function redirectTo(location: string) {
	return new Response(null, { status: 303, headers: { location } });
}

export const handle: Handle = async ({ event, resolve }) => {
	const { deviceId, player } = await loadDevice(event.cookies);
	event.locals.deviceId = deviceId;
	event.locals.player = player;

	// Everything is behind the group code, and then behind choosing a profile.
	const path = event.url.pathname;
	if (!deviceId && path !== '/join') return redirectTo('/join');
	if (deviceId && !player && path !== '/welcome' && path !== '/join') return redirectTo('/welcome');

	return resolve(event);
};
