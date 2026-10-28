import { listActiveSessions, listFinishedSessions } from '#lib/server/sessions.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [active, finished] = await Promise.all([listActiveSessions(), listFinishedSessions()]);
	return { active, finished };
};
