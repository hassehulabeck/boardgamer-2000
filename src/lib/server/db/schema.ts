import { sql } from 'drizzle-orm';
import {
	boolean,
	customType,
	date,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';

/** Raw binary column, used for small images (avatars, game pictures). */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
	dataType() {
		return 'bytea';
	}
});

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const players = pgTable(
	'players',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: text('name').notNull(),
		color: text('color').notNull(),
		avatar: bytea('avatar'),
		avatarUpdatedAt: timestamp('avatar_updated_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('players_name_lower_idx').on(sql`lower(${t.name})`)]
);

/** A phone (or browser) that has entered the group code. Linked to a player once chosen. */
export const devices = pgTable(
	'devices',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tokenHash: text('token_hash').notNull().unique(),
		playerId: uuid('player_id').references(() => players.id, { onDelete: 'set null' }),
		userAgent: text('user_agent'),
		createdAt: createdAt(),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('devices_player_idx').on(t.playerId)]
);

export const games = pgTable(
	'games',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		title: text('title').notNull(),
		image: bytea('image'),
		imageUpdatedAt: timestamp('image_updated_at', { withTimezone: true }),
		bggUrl: text('bgg_url'),
		createdBy: uuid('created_by').references(() => players.id, { onDelete: 'set null' }),
		createdAt: createdAt(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('games_title_lower_idx').on(sql`lower(${t.title})`)]
);

/** draft → playing → finished. See PLAN.md for the lifecycle and cleanup rules. */
export const sessions = pgTable(
	'sessions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		gameId: uuid('game_id')
			.notNull()
			.references(() => games.id, { onDelete: 'restrict' }),
		status: text('status', { enum: ['draft', 'playing', 'finished'] }).notNull().default('draft'),
		startingPlayerId: uuid('starting_player_id').references(() => players.id, { onDelete: 'set null' }),
		createdBy: uuid('created_by').references(() => players.id, { onDelete: 'set null' }),
		createdAt: createdAt(),
		startedAt: timestamp('started_at', { withTimezone: true }),
		endedAt: timestamp('ended_at', { withTimezone: true }),
		updatedBy: uuid('updated_by').references(() => players.id, { onDelete: 'set null' }),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('sessions_status_idx').on(t.status), index('sessions_game_idx').on(t.gameId)]
);

export const sessionPlayers = pgTable(
	'session_players',
	{
		sessionId: uuid('session_id')
			.notNull()
			.references(() => sessions.id, { onDelete: 'cascade' }),
		playerId: uuid('player_id')
			.notNull()
			.references(() => players.id, { onDelete: 'restrict' }),
		score: integer('score'),
		isWinner: boolean('is_winner').notNull().default(false)
	},
	(t) => [primaryKey({ columns: [t.sessionId, t.playerId] }), index('session_players_player_idx').on(t.playerId)]
);

/** "Want to play today": one lunch slot per person per day. Old days are simply ignored. */
export const availability = pgTable(
	'availability',
	{
		day: date('day', { mode: 'string' }).notNull(),
		playerId: uuid('player_id')
			.notNull()
			.references(() => players.id, { onDelete: 'cascade' }),
		slot: text('slot').notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.day, t.playerId] })]
);

export type Player = typeof players.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Session = typeof sessions.$inferSelect;
