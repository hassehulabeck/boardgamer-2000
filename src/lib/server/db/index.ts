import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$app/env/private';
import * as schema from './schema.js';

const client = postgres(DATABASE_URL, { max: 5 });

export const db = drizzle(client, { schema });
export { schema };
