import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.js';
import { imageResponse, isUuid } from '#lib/server/images.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!isUuid(params.id)) error(404);
	const [row] = await db
		.select({ image: schema.games.image })
		.from(schema.games)
		.where(eq(schema.games.id, params.id));
	if (!row?.image) error(404);
	return imageResponse(row.image);
};
