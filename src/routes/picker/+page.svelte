<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import { nextColor } from '#lib/colors.js';
	import { randomIndex } from '#lib/picker.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** Fingers needed before the countdown starts. */
	const MIN_FINGERS = 2;
	/** How long fingers must stay put (no one adding or lifting) before a pick. */
	const ARM_MS = 2000;
	/** How long the result stays visible after everyone lets go. */
	const RESULT_HOLD_MS = 1500;

	type Finger = { id: number; x: number; y: number; color: string };
	type Phase = 'idle' | 'arming' | 'picked';

	let fingers = $state<Finger[]>([]);
	let phase = $state<Phase>('idle');
	let winnerId = $state<number | null>(null);
	/** Bumped each time the countdown restarts, so the ring animation restarts too. */
	let armCycle = $state(0);
	let maxTouchPoints = $state(0);
	/** In session mode: after a pick, ask whose finger it was so the game can start. */
	let askWho = $state(false);

	/** Pointers physically on the screen. After a pick, fingers stay drawn until reset. */
	const down = new Set<number>();
	let armTimer: ReturnType<typeof setTimeout> | undefined;
	let resetTimer: ReturnType<typeof setTimeout> | undefined;
	let surface: HTMLDivElement;

	onMount(() => {
		maxTouchPoints = navigator.maxTouchPoints;

		// Svelte attaches touch listeners as passive; a non-passive one is needed to stop
		// iOS from zooming, scrolling or showing the long-press menu.
		const block = (e: TouchEvent) => e.preventDefault();
		surface.addEventListener('touchstart', block, { passive: false });
		surface.addEventListener('touchmove', block, { passive: false });
		return () => {
			surface.removeEventListener('touchstart', block);
			surface.removeEventListener('touchmove', block);
			clearTimeout(armTimer);
			clearTimeout(resetTimer);
		};
	});

	function rearm() {
		clearTimeout(armTimer);
		if (fingers.length >= MIN_FINGERS) {
			phase = 'arming';
			armCycle++;
			armTimer = setTimeout(pick, ARM_MS);
		} else {
			phase = 'idle';
		}
	}

	function pick() {
		winnerId = fingers[randomIndex(fingers.length)].id;
		phase = 'picked';
		navigator.vibrate?.([60, 40, 160]);
	}

	function reset() {
		clearTimeout(resetTimer);
		fingers = [];
		winnerId = null;
		askWho = false;
		phase = 'idle';
	}

	function onpointerdown(e: PointerEvent) {
		if (askWho) return;
		if (phase === 'picked') {
			// Ignore new fingers while people are still holding the result.
			if (down.size > 0) return;
			reset();
		}
		down.add(e.pointerId);
		fingers.push({
			id: e.pointerId,
			x: e.clientX,
			y: e.clientY,
			color: nextColor(fingers.map((f) => f.color))
		});
		rearm();
	}

	function onpointermove(e: PointerEvent) {
		if (phase === 'picked') return;
		const finger = fingers.find((f) => f.id === e.pointerId);
		if (finger) {
			finger.x = e.clientX;
			finger.y = e.clientY;
		}
	}

	function onpointerup(e: PointerEvent) {
		if (!down.delete(e.pointerId)) return;
		if (phase === 'picked') {
			if (down.size === 0) {
				if (data.session) askWho = true;
				else resetTimer = setTimeout(reset, RESULT_HOLD_MS);
			}
			return;
		}
		fingers = fingers.filter((f) => f.id !== e.pointerId);
		rearm();
	}

	const hint = $derived.by(() => {
		if (phase === 'picked') return 'You start!';
		if (phase === 'arming') return 'Hold still…';
		if (fingers.length === 1) return 'Waiting for more fingers…';
		return 'Everyone put a finger on the screen';
	});
</script>

<svelte:head>
	<title>Who starts? · Boardgamer 2000</title>
</svelte:head>

<div
	class="surface"
	class:picked={phase === 'picked'}
	bind:this={surface}
	{onpointerdown}
	{onpointermove}
	{onpointerup}
	onpointercancel={onpointerup}
	oncontextmenu={(e) => e.preventDefault()}
	role="application"
	aria-label="Starting player picker"
>
	{#if phase === 'picked'}
		{@const winner = fingers.find((f) => f.id === winnerId)}
		{#if winner}
			<div class="flood" style:--color={winner.color} style:--x="{winner.x}px" style:--y="{winner.y}px"></div>
		{/if}
	{/if}

	{#each fingers as finger (finger.id)}
		<div
			class="finger"
			class:winner={finger.id === winnerId}
			class:loser={phase === 'picked' && finger.id !== winnerId}
			style:--color={finger.color}
			style:left="{finger.x}px"
			style:top="{finger.y}px"
		>
			{#key armCycle}
				{#if phase === 'arming'}
					<svg class="ring" viewBox="0 0 100 100" style:--arm-ms="{ARM_MS}ms">
						<circle cx="50" cy="50" r="46" pathLength="100" />
					</svg>
				{/if}
			{/key}
		</div>
	{/each}

	<p class="hint" class:on-color={phase === 'picked'}>{hint}</p>
	{#if phase === 'idle' && fingers.length === 0 && maxTouchPoints > 0 && maxTouchPoints < 10}
		<p class="limit">This device tracks up to {maxTouchPoints} fingers at once</p>
	{/if}
</div>

{#if askWho && data.session}
	<div class="sheet" role="dialog" aria-label="Whose finger was it?">
		<h2>Whose finger was it?</h2>
		<form method="post" action="/sessions/{data.session.id}?/start" use:enhance>
			<div class="who">
				{#each data.session.players as player (player.id)}
					<button name="startingPlayerId" value={player.id}>
						<Avatar name={player.name} color={player.color} src={player.avatarUrl} size={56} />
						<span>{player.name}</span>
					</button>
				{/each}
			</div>
		</form>
		<button type="button" class="link" onclick={reset}>Pick again</button>
	</div>
{/if}

<a class="back" href={data.session ? `/sessions/${data.session.id}` : '/'} aria-label="Back">←</a>

<style>
	.surface {
		position: fixed;
		inset: 0;
		overflow: hidden;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
		-webkit-tap-highlight-color: transparent;
	}

	.finger {
		position: absolute;
		width: 96px;
		height: 96px;
		margin: -48px 0 0 -48px;
		border-radius: 50%;
		background: var(--color);
		box-shadow: 0 0 32px var(--color);
		pointer-events: none;
		animation:
			appear 180ms ease-out,
			pulse 1.2s ease-in-out 180ms infinite;
		transition:
			transform 400ms ease,
			opacity 400ms ease;
	}
	.ring {
		position: absolute;
		inset: -18px;
		width: calc(100% + 36px);
		height: calc(100% + 36px);
		transform: rotate(-90deg);
	}
	.ring circle {
		fill: none;
		stroke: var(--color);
		stroke-width: 5;
		stroke-linecap: round;
		stroke-dasharray: 100;
		stroke-dashoffset: 100;
		animation: fill-ring var(--arm-ms) linear forwards;
	}
	.loser {
		animation: none;
		opacity: 0;
		transform: scale(0.3);
	}
	.winner {
		animation: none;
		transform: scale(1.6);
		box-shadow:
			0 0 0 10px var(--bg),
			0 0 0 16px var(--color),
			0 0 60px var(--color);
		z-index: 2;
	}

	/* The winner's color washes over the screen from their finger. */
	.flood {
		position: absolute;
		inset: 0;
		background: var(--color);
		clip-path: circle(0 at var(--x) var(--y));
		animation: flood 650ms cubic-bezier(0.2, 0.7, 0.2, 1) 150ms forwards;
		opacity: 0.85;
		pointer-events: none;
	}

	.hint,
	.limit {
		position: absolute;
		left: 16px;
		right: 16px;
		margin: 0;
		text-align: center;
		pointer-events: none;
	}
	.hint {
		top: calc(env(safe-area-inset-top) + 72px);
		font-size: 1.5rem;
		font-weight: 600;
		transition: color 300ms;
	}
	.hint.on-color {
		color: #100e1c;
		z-index: 3;
		font-size: 2rem;
	}
	.limit {
		bottom: calc(env(safe-area-inset-bottom) + 32px);
		color: var(--muted);
		font-size: 0.9rem;
	}

	.back {
		position: fixed;
		top: calc(env(safe-area-inset-top) + 12px);
		left: 12px;
		z-index: 5;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--surface);
		color: var(--text);
		font-size: 1.4rem;
		text-decoration: none;
	}
	.picked ~ .back {
		visibility: hidden;
	}

	.sheet {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 10;
		padding: 20px 16px calc(env(safe-area-inset-bottom) + 20px);
		border-radius: 20px 20px 0 0;
		background: var(--surface);
		box-shadow: 0 -8px 32px rgb(0 0 0 / 0.5);
		text-align: center;
		animation: slide-up 250ms ease-out;
	}
	.sheet h2 {
		margin: 0 0 16px;
		font-size: 1.3rem;
	}
	.who {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 12px;
		margin-bottom: 12px;
	}
	.who button {
		display: grid;
		justify-items: center;
		gap: 6px;
		width: 76px;
		padding: 8px 4px;
		border: none;
		border-radius: 14px;
		background: var(--surface-2);
		color: var(--text);
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.who span {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
	}

	@keyframes appear {
		from {
			transform: scale(0.2);
			opacity: 0;
		}
	}
	@keyframes pulse {
		50% {
			transform: scale(1.12);
		}
	}
	@keyframes fill-ring {
		to {
			stroke-dashoffset: 0;
		}
	}
	@keyframes flood {
		to {
			clip-path: circle(150% at var(--x) var(--y));
		}
	}
</style>
