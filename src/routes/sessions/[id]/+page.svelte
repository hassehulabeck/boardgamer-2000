<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Avatar from '#lib/components/Avatar.svelte';
	import GameImage from '#lib/components/GameImage.svelte';
	import GameSelect from '#lib/components/GameSelect.svelte';
	import PlayerSelect from '#lib/components/PlayerSelect.svelte';
	import ResultForm from '#lib/components/ResultForm.svelte';
	import Wheel from '#lib/components/Wheel.svelte';
	import { formatClock, formatDay, formatDuration, formatTime } from '#lib/format.js';
	import type { PlayerSummary } from '#lib/players.js';
	import { hasNoTimes, isUnfinished } from '#lib/sessions.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const session = $derived(data.session);
	const starter = $derived(session.players.find((p) => p.id === session.startingPlayerId));

	let now = $state(Date.now());
	let showWheel = $state(false);
	let wheelPick = $state<PlayerSummary | null>(null);
	let editing = $state(false);
	let busy = $state(false);
	/** How many fingers this phone can track; 0 until known (or on desktops). */
	let maxTouch = $state(0);

	// svelte-ignore state_referenced_locally -- the setup form starts from the saved draft
	let setupGame = $state(data.session.game.id);
	// svelte-ignore state_referenced_locally
	let setupPlayers = $state(data.session.players.map((p) => p.id));

	/** Too many players for the finger picker on this phone → suggest the wheel. */
	const preferWheel = $derived(maxTouch > 0 && session.players.length > maxTouch);

	onMount(() => {
		maxTouch = navigator.maxTouchPoints;
		const clock = setInterval(() => (now = Date.now()), 1000);
		// Keep everyone's phone in step: someone else may start or finish this game.
		const poll = setInterval(() => {
			if (document.visibilityState === 'visible' && session.status !== 'finished' && !busy) {
				invalidateAll();
			}
		}, 10_000);
		return () => {
			clearInterval(clock);
			clearInterval(poll);
		};
	});

	function submitting() {
		busy = true;
		return async ({ update }: { update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			busy = false;
		};
	}

	function confirmDelete(message: string) {
		return ({ cancel }: { cancel: () => void }) => {
			if (!confirm(message)) cancel();
		};
	}
</script>

<svelte:head>
	<title>{session.game.title} · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<a class="back" href="/sessions" aria-label="Back to sessions">←</a>

	<header>
		<GameImage title={session.game.title} src={session.game.imageUrl} size={72} />
		<div>
			<h1>{session.game.title}</h1>
			<p class="muted">
				{#if session.status === 'draft'}
					Not started yet{session.createdByName ? ` · set up by ${session.createdByName}` : ''}
				{:else if session.status === 'playing'}
					Started {formatTime(session.startedAt!)}{starter ? ` · ${starter.name} went first` : ''}
				{:else if hasNoTimes(session)}
					{formatDay(session.startedAt!)} · time not recorded
				{:else}
					{formatDay(session.startedAt!)} · {formatTime(session.startedAt!)}–{formatTime(session.endedAt!)}
					· {formatDuration(session.endedAt!.getTime() - session.startedAt!.getTime())}
				{/if}
			</p>
		</div>
	</header>

	{#if session.status === 'draft'}
		<!-- ───────────── Draft: choose who starts ───────────── -->
		<ul class="lineup">
			{#each session.players as player (player.id)}
				<li>
					<Avatar name={player.name} color={player.color} src={player.avatarUrl} size={44} />
					<span>{player.name}</span>
				</li>
			{/each}
		</ul>

		<section>
			<h2>Who starts?</h2>
			{#if session.players.length >= 2}
				<div class="methods" class:wheel-first={preferWheel}>
					<a class="button" class:secondary={preferWheel} href="/picker?session={session.id}">
						☝️ Finger picker
					</a>
					<button
						type="button"
						class="button"
						class:secondary={!preferWheel}
						onclick={() => {
							showWheel = !showWheel;
							wheelPick = null;
						}}
					>
						🎡 Spin the wheel
					</button>
				</div>
				{#if preferWheel}
					<p class="muted small">
						This phone tracks {maxTouch === 1 ? '1 finger' : `${maxTouch} fingers`} at once, so the wheel
						works better for {session.players.length} players.
					</p>
				{/if}

				{#if showWheel}
					<Wheel players={session.players} onresult={(p) => (wheelPick = p)} />
					{#if wheelPick}
						<form method="post" action="?/start" use:enhance={submitting} class="wheel-result">
							<p><strong>{wheelPick.name}</strong> starts!</p>
							<button class="button" name="startingPlayerId" value={wheelPick.id} disabled={busy}>
								Start the game
							</button>
						</form>
					{/if}
				{/if}
			{/if}

			<form method="post" action="?/start" use:enhance={submitting}>
				{#if session.players.length >= 2}
					<p class="muted small">Already know who starts? Tap them:</p>
					<div class="tap-starter">
						{#each session.players as player (player.id)}
							<button name="startingPlayerId" value={player.id} disabled={busy} aria-label="{player.name} starts">
								<Avatar name={player.name} color={player.color} src={player.avatarUrl} size={44} />
							</button>
						{/each}
					</div>
				{/if}
				<button class="button secondary" disabled={busy}>Start without choosing</button>
			</form>
		</section>

		<details class="setup">
			<summary>Change game or players</summary>
			<form method="post" action="?/setup" use:enhance={submitting}>
				<h3>Game</h3>
				<GameSelect games={data.games} bind:selected={setupGame} />
				<h3>Players</h3>
				<PlayerSelect players={data.players} bind:selected={setupPlayers} />
				{#if form?.setupError}
					<p class="error">{form.setupError}</p>
				{/if}
				<button class="button" disabled={busy || setupPlayers.length === 0}>Save changes</button>
			</form>
		</details>

		<form method="post" action="?/delete" use:enhance={confirmDelete('Cancel this session?')} class="danger-zone">
			<button class="button danger">Cancel session</button>
		</form>
		<p class="muted small center">Sessions that aren't started within an hour are removed automatically.</p>
	{:else if session.status === 'playing'}
		<!-- ───────────── Playing: clock and finish ───────────── -->
		{#if isUnfinished(session, now)}
			<p class="banner">
				This game was never finished. Fill in the result and fix the end time, or discard it.
			</p>
		{:else}
			<p class="clock" aria-label="Time played">{formatClock(now - session.startedAt!.getTime())}</p>
		{/if}

		<section>
			<h2>Finish</h2>
			<ResultForm {session} action="?/result" submitLabel="Finish game" error={form?.resultError} />
		</section>

		<form method="post" action="?/delete" use:enhance={confirmDelete('Discard this game? Nothing will be saved.')} class="danger-zone">
			<button class="button danger">Discard session</button>
		</form>
	{:else}
		<!-- ───────────── Finished: result ───────────── -->
		{#if editing}
			<section>
				<h2>Edit result</h2>
				<ResultForm
					{session}
					action="?/result"
					submitLabel="Save changes"
					error={form?.resultError}
					onsaved={() => (editing = false)}
				/>
				<button type="button" class="link cancel" onclick={() => (editing = false)}>Cancel</button>
			</section>
		{:else}
			<ol class="result">
				{#each session.players as player (player.id)}
					<li class:won={player.isWinner}>
						<Avatar name={player.name} color={player.color} src={player.avatarUrl} size={44} />
						<span class="name">{player.name}</span>
						{#if player.score !== null}
							<span class="score">{player.score}</span>
						{/if}
						<span class="trophy" aria-label={player.isWinner ? 'Winner' : undefined}>
							{player.isWinner ? '🏆' : ''}
						</span>
					</li>
				{/each}
			</ol>
			{#if !session.players.some((p) => p.isWinner)}
				<p class="muted center">Nobody won. The game won this time.</p>
			{/if}

			<dl class="meta">
				{#if starter}
					<dt>Went first</dt>
					<dd>{starter.name}</dd>
				{/if}
				{#if session.createdByName}
					<dt>Logged by</dt>
					<dd>{session.createdByName}</dd>
				{/if}
				{#if session.updatedByName}
					<dt>Edited by</dt>
					<dd>{session.updatedByName}, {formatDay(session.updatedAt)} {formatTime(session.updatedAt)}</dd>
				{/if}
			</dl>
			{#if form?.resultSaved}
				<p class="saved">Saved ✓</p>
			{/if}

			<button type="button" class="button secondary" onclick={() => (editing = true)}>Edit result</button>
			<form method="post" action="?/delete" use:enhance={confirmDelete('Delete this session?')} class="danger-zone">
				<button class="button danger">Delete session</button>
			</form>
		{/if}
	{/if}
</main>

<style>
	header {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 20px;
	}
	header h1 {
		font-size: 1.6rem;
	}
	header p {
		margin: 0;
	}
	h2 {
		margin: 0 0 12px;
		font-size: 1.2rem;
	}
	h3 {
		margin: 20px 0 10px;
		font-size: 1rem;
	}
	section {
		margin-top: 24px;
	}
	.small {
		font-size: 0.9rem;
	}
	.center {
		text-align: center;
	}
	.lineup {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.lineup li {
		display: grid;
		justify-items: center;
		gap: 4px;
		width: 60px;
		font-size: 0.8rem;
		text-align: center;
	}
	.lineup span {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.methods {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.methods.wheel-first a {
		order: 2;
	}
	.methods .button {
		padding: 14px 8px;
	}
	.wheel-result {
		margin-top: 16px;
		text-align: center;
	}
	.wheel-result p {
		margin: 0 0 10px;
		font-size: 1.4rem;
	}
	.tap-starter {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-bottom: 16px;
	}
	.tap-starter button {
		padding: 0;
		border: none;
		border-radius: 50%;
		background: none;
		cursor: pointer;
	}
	.setup {
		margin-top: 28px;
		padding: 14px 16px;
		border-radius: 14px;
		background: var(--surface);
	}
	.setup summary {
		font-weight: 600;
		cursor: pointer;
	}
	.setup .button {
		margin-top: 16px;
	}
	.danger-zone {
		margin-top: 32px;
	}
	.clock {
		margin: 8px 0 0;
		font-size: 3.5rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		text-align: center;
	}
	.banner {
		padding: 14px 16px;
		border-radius: 14px;
		background: color-mix(in srgb, var(--danger) 18%, var(--surface));
	}
	.result {
		display: grid;
		gap: 8px;
		margin: 0 0 16px;
		padding: 0;
		list-style: none;
	}
	.result li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px 10px 10px;
		border-radius: 14px;
		background: var(--surface);
	}
	.result li.won {
		box-shadow: inset 0 0 0 2px var(--accent);
	}
	.result .name {
		flex: 1;
		font-weight: 600;
	}
	.result .score {
		font-size: 1.2rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.result .trophy {
		width: 28px;
		font-size: 1.4rem;
		text-align: center;
	}
	.meta {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 16px;
		margin: 20px 0;
	}
	.meta dt {
		color: var(--muted);
	}
	.meta dd {
		margin: 0;
	}
	.saved {
		color: #06d6a0;
		font-weight: 600;
	}
	.cancel {
		display: block;
		margin: 16px auto 0;
	}
</style>
