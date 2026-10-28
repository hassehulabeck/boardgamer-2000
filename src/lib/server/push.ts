import { and, eq, inArray, isNotNull, notInArray } from 'drizzle-orm';
import webpush from 'web-push';
import { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY } from '$app/env/private';
import { GAME_ON_COUNT } from '#lib/availability.js';
import { dayKey } from '#lib/format.js';
import type { PlayerSummary } from '#lib/players.js';
import { db, schema } from './db/index.js';

const { pushSubscriptions, devices } = schema;

/** Handed to the browser so it can subscribe; null when push isn't configured. */
export const vapidPublicKey = VAPID_PRIVATE_KEY ? (VAPID_PUBLIC_KEY ?? null) : null;

type Payload = { title: string; body: string; url?: string; tag?: string };

/** Reads and stores a subscription sent from the browser (`PushSubscription.toJSON()`). */
export async function saveSubscription(deviceId: string, raw: unknown): Promise<boolean> {
	const sub = raw as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
	const endpoint = sub?.endpoint;
	const p256dh = sub?.keys?.p256dh;
	const auth = sub?.keys?.auth;
	if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) return false;
	if (typeof p256dh !== 'string' || typeof auth !== 'string') return false;
	await db
		.insert(pushSubscriptions)
		.values({ endpoint, deviceId, p256dh, auth })
		.onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { deviceId, p256dh, auth } });
	return true;
}

export async function removeSubscription(deviceId: string, endpoint: string) {
	await db
		.delete(pushSubscriptions)
		.where(and(eq(pushSubscriptions.deviceId, deviceId), eq(pushSubscriptions.endpoint, endpoint)));
}

/** Push services want a contact URL. The live site is https; the dev server isn't. */
function vapidSubject(origin: string) {
	return origin.startsWith('https://') ? origin : 'mailto:dev@example.com';
}

type Target = { deviceId: string } | { playerIds: string[] } | { allExcept: string[] };

/**
 * Sends to every matching phone. Never throws: a failed push must not break the action that
 * caused it. Subscriptions the push service says are gone are deleted.
 */
export async function sendPush(target: Target, payload: Payload, origin: string) {
	if (!vapidPublicKey || !VAPID_PRIVATE_KEY) return;
	try {
		if ('playerIds' in target && target.playerIds.length === 0) return;
		const where =
			'deviceId' in target
				? eq(pushSubscriptions.deviceId, target.deviceId)
				: 'playerIds' in target
					? inArray(devices.playerId, target.playerIds)
					: and(
							isNotNull(devices.playerId), // a phone that left the group gets nothing
							target.allExcept.length ? notInArray(devices.playerId, target.allExcept) : undefined
						);

		const subs = await db
			.select({ endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth })
			.from(pushSubscriptions)
			.innerJoin(devices, eq(devices.id, pushSubscriptions.deviceId))
			.where(where);

		const body = JSON.stringify(payload);
		await Promise.all(
			subs.map(async ({ endpoint, p256dh, auth }) => {
				try {
					await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, body, {
						vapidDetails: { subject: vapidSubject(origin), publicKey: vapidPublicKey, privateKey: VAPID_PRIVATE_KEY! },
						TTL: 60 * 60
					});
				} catch (err) {
					const status = (err as { statusCode?: number }).statusCode;
					if (status === 404 || status === 410) {
						await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
					} else {
						console.error('Push failed', status ?? err);
					}
				}
			})
		);
	} catch (err) {
		console.error('Push failed', err);
	}
}

// ---------------------------------------------------------------------------------------------
// Lunch

/** Slots already announced today, so leaving and rejoining doesn't ping everyone again. */
const announced = new Set<string>();

/** "Anna", "Anna and Bo", "Anna, Bo and Cecilia" */
function names(players: PlayerSummary[]): string {
	const list = players.map((p) => p.name);
	return list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : (list[0] ?? '');
}

/**
 * Someone joined a lunch slot. People already in it hear who joined; when the slot reaches
 * GAME_ON_COUNT, everyone else hears that a game is on (once per slot and day).
 */
export async function notifyLunchJoin(
	joiner: PlayerSummary,
	slot: string,
	inSlot: PlayerSummary[],
	origin: string
) {
	const others = inSlot.filter((p) => p.id !== joiner.id);
	const tag = `lunch-${slot}`;
	const sends = [
		sendPush(
			{ playerIds: others.map((p) => p.id) },
			{
				title: `${joiner.name} is in at ${slot}`,
				body: `${inSlot.length} people are coming at ${slot}: ${names(inSlot)}`,
				url: '/',
				tag
			},
			origin
		)
	];

	const key = `${dayKey(new Date())} ${slot}`;
	if (inSlot.length >= GAME_ON_COUNT && !announced.has(key)) {
		announced.add(key);
		sends.push(
			sendPush(
				{ allExcept: inSlot.map((p) => p.id) },
				{
					title: `Game on at ${slot} 🎲`,
					body: `${names(inSlot)} are playing at ${slot}. Join them?`,
					url: '/',
					tag
				},
				origin
			)
		);
	}
	await Promise.all(sends);
}
