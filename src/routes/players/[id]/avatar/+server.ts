import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { imageResponse, isUuid } from '#lib/server/images.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!isUuid(params.id)) error(404);
	const [row] = await db
		.select({ avatar: schema.players.avatar })
		.from(schema.players)
		.where(eq(schema.players.id, params.id));
	if (!row?.avatar) error(404);
	return imageResponse(row.avatar);
};
