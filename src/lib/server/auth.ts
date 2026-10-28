import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { GROUP_CODE } from '$app/env/private';
import type { PlayerSummary } from '#lib/players.js';
import { db, schema } from './db/index.js';
import { summaryColumns, toSummary } from './players.js';

const { devices, players } = schema;

const DEVICE_COOKIE = 'bg_device';
/** 400 days is the longest lifetime browsers accept; the cookie is refreshed on use. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

function sha256(value: string): Buffer {
	return createHash('sha256').update(value).digest();
}

function setDeviceCookie(cookies: Cookies, token: string) {
	cookies.set(DEVICE_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: COOKIE_MAX_AGE
	});
}

/** Case- and whitespace-insensitive, compared in constant time. */
export function checkGroupCode(input: FormDataEntryValue | null): boolean {
	const normalize = (s: string) => s.trim().toLowerCase();
	return timingSafeEqual(sha256(normalize(String(input ?? ''))), sha256(normalize(GROUP_CODE)));
}

/** Registers this browser as a device in the group. Only a hash of the token is stored. */
export async function createDevice(cookies: Cookies, userAgent: string | null) {
	const token = randomBytes(32).toString('base64url');
	await db.insert(devices).values({ tokenHash: sha256(token).toString('hex'), userAgent });
	setDeviceCookie(cookies, token);
}

/** Looks up the device and its player from the cookie, refreshing both once a day. */
export async function loadDevice(
	cookies: Cookies
): Promise<{ deviceId: string | null; player: PlayerSummary | null }> {
	const token = cookies.get(DEVICE_COOKIE);
	if (!token) return { deviceId: null, player: null };

	const [row] = await db
		.select({ id: devices.id, lastSeenAt: devices.lastSeenAt, player: summaryColumns })
		.from(devices)
		.leftJoin(players, eq(players.id, devices.playerId))
		.where(eq(devices.tokenHash, sha256(token).toString('hex')));

	if (!row) {
		cookies.delete(DEVICE_COOKIE, { path: '/' });
		return { deviceId: null, player: null };
	}

	if (Date.now() - row.lastSeenAt.getTime() > REFRESH_AFTER_MS) {
		await db.update(devices).set({ lastSeenAt: new Date() }).where(eq(devices.id, row.id));
		setDeviceCookie(cookies, token);
	}

	return { deviceId: row.id, player: row.player ? toSummary(row.player) : null };
}

export async function linkDevice(deviceId: string, playerId: string | null) {
	await db.update(devices).set({ playerId }).where(eq(devices.id, deviceId));
}
