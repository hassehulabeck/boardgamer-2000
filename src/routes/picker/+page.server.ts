import { isUuid } from '#lib/server/images.js';
import { getSession } from '#lib/server/sessions.js';
import type { PageServerLoad } from './$types';

/** With ?session=<id>, the picker asks whose finger won and starts that session. */
export const load: PageServerLoad = async ({ url }) => {
	const id = url.searchParams.get('session') ?? '';
	const session = isUuid(id) ? await getSession(id) : null;
	if (!session || session.status !== 'draft') return { session: null };
	return { session: { id: session.id, players: session.players } };
};
