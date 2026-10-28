<script lang="ts">
	import { onMount } from 'svelte';
	import { GAME_ON_COUNT } from '#lib/availability.js';

	type Props = { publicKey: string };

	let { publicKey }: Props = $props();

	type Status = 'loading' | 'install' | 'unsupported' | 'denied' | 'off' | 'on';
	let status = $state<Status>('loading');
	let busy = $state(false);
	let message = $state<string | null>(null);

	// iPhones only allow push in the home-screen app, not in Safari itself.
	const isIos = () =>
		/iPhone|iPad|iPod/.test(navigator.userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const isStandalone = () => matchMedia('(display-mode: standalone)').matches;

	onMount(async () => {
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			status = isIos() && !isStandalone() ? 'install' : 'unsupported';
			return;
		}
		if (Notification.permission === 'denied') {
			status = 'denied';
			return;
		}
		const registration = await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.getSubscription();
		status = subscription ? 'on' : 'off';
		// Re-send it in case the server forgot (e.g. the phone left and rejoined the group).
		if (subscription) await save(subscription);
	});

	async function save(subscription: PushSubscription) {
		const response = await fetch('/api/push', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(subscription.toJSON())
		});
		if (!response.ok) throw new Error('Could not save');
	}

	async function turnOn() {
		busy = true;
		message = null;
		try {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				status = permission === 'denied' ? 'denied' : 'off';
				return;
			}
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: base64UrlToBytes(publicKey)
			});
			await save(subscription);
			status = 'on';
		} catch {
			message = "Couldn't turn on notifications. Try again in a moment.";
		} finally {
			busy = false;
		}
	}

	async function turnOff() {
		busy = true;
		message = null;
		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();
			if (subscription) {
				await fetch('/api/push', {
					method: 'DELETE',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ endpoint: subscription.endpoint })
				});
				await subscription.unsubscribe();
			}
			status = 'off';
		} finally {
			busy = false;
		}
	}

	async function test() {
		busy = true;
		await fetch('/api/push/test', { method: 'POST' });
		message = 'Sent! It should pop up in a few seconds.';
		busy = false;
	}

	function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
		const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
		return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	}
</script>

{#if status === 'install'}
	<p class="muted">
		On iPhone, notifications only work in the app: tap Share → <strong>Add to Home Screen</strong>,
		open Boardgamer from there, and turn them on here.
	</p>
{:else if status === 'unsupported'}
	<p class="muted">This browser can't show notifications.</p>
{:else if status === 'denied'}
	<p class="muted">
		Notifications are blocked for this app. Allow them in your phone's settings, then come back.
	</p>
{:else if status === 'on'}
	<p class="muted">On for this phone. You'll hear when someone joins your lunch time, and when a game is on.</p>
	<div class="actions">
		<button class="button secondary" onclick={test} disabled={busy}>Send me a test</button>
		<button class="button secondary" onclick={turnOff} disabled={busy}>Turn off</button>
	</div>
{:else if status === 'off'}
	<p class="muted">Get a ping when someone joins your lunch time, or when {GAME_ON_COUNT} people are in for a game.</p>
	<button class="button" onclick={turnOn} disabled={busy}>Turn on notifications</button>
{/if}
{#if message}
	<p class="message">{message}</p>
{/if}

<style>
	p {
		margin: 0 0 12px;
	}
	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.message {
		margin: 12px 0 0;
		color: var(--muted);
		font-weight: 600;
	}
</style>
