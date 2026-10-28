import { count } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { listPlayers } from '#lib/server/players.js';
import { listActiveSessions } from '#lib/server/sessions.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [players, active, [{ gameCount }]] = await Promise.all([
		listPlayers(),
		listActiveSessions(),
		db.select({ gameCount: count() }).from(schema.games)
	]);
	return { players, active, gameCount };
};
