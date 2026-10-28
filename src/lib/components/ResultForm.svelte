<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import { formatTime } from '#lib/format.js';
	import type { SessionDetail } from '#lib/sessions.js';

	type Props = {
		session: SessionDetail;
		action: string;
		submitLabel: string;
		error?: string | null;
		/** Called after a successful save, e.g. to close an edit panel. */
		onsaved?: () => void;
	};

	let { session, action, submitLabel, error = null, onsaved }: Props = $props();

	// The form starts from the saved session and is then edited locally.
	// svelte-ignore state_referenced_locally
	const initial = session;
	let scores = $state<Record<string, string>>(
		Object.fromEntries(initial.players.map((p) => [p.id, p.score === null ? '' : String(p.score)]))
	);
	let winners = $state<string[]>(initial.players.filter((p) => p.isWinner).map((p) => p.id));
	/** Once someone taps a trophy, stop picking winners from the scores. */
	let winnersTouched = $state(initial.status === 'finished');
	let nobodyWon = $state(initial.status === 'finished' && !initial.players.some((p) => p.isWinner));
	let start = $state(formatTime(initial.startedAt ?? initial.createdAt));
	let end = $state(formatTime(initial.endedAt ?? new Date()));
	/** For a running game the end time follows the clock until someone changes it. */
	let endTouched = $state(initial.endedAt !== null);
	let busy = $state(false);

	onMount(() => {
		const timer = setInterval(() => {
			if (!endTouched) end = formatTime(new Date());
		}, 15_000);
		return () => clearInterval(timer);
	});

	function onScoreInput() {
		if (winnersTouched || nobodyWon) return;
		const numbers = Object.entries(scores)
			.filter(([, v]) => v.trim() !== '' && Number.isFinite(Number(v)))
			.map(([id, v]) => [id, Number(v)] as const);
		if (numbers.length === 0) return;
		const best = Math.max(...numbers.map(([, n]) => n));
		winners = numbers.filter(([, n]) => n === best).map(([id]) => id);
	}

	function toggleWinner(id: string) {
		winnersTouched = true;
		nobodyWon = false;
		winners = winners.includes(id) ? winners.filter((w) => w !== id) : [...winners, id];
	}
</script>

<form
	method="post"
	{action}
	use:enhance={({ formData }) => {
		busy = true;
		if (!endTouched) formData.set('end', formatTime(new Date()));
		return async ({ result, update }) => {
			await update({ reset: false });
			busy = false;
			if (result.type === 'success' || result.type === 'redirect') onsaved?.();
		};
	}}
>
	<ul class="rows">
		{#each session.players as player (player.id)}
			{@const won = winners.includes(player.id)}
			<li class:won>
				<Avatar name={player.name} color={player.color} src={player.avatarUrl} size={40} />
				<span class="name">{player.name}</span>
				<input
					class="score"
					type="text"
					name="score:{player.id}"
					inputmode="numeric"
					pattern="-?[0-9]*"
					placeholder="pts"
					aria-label="{player.name}'s score"
					bind:value={scores[player.id]}
					oninput={onScoreInput}
				/>
				<button
					type="button"
					class="trophy"
					aria-pressed={won}
					aria-label="{player.name} won"
					onclick={() => toggleWinner(player.id)}>🏆</button
				>
				{#if won}
					<input type="hidden" name="winner" value={player.id} />
				{/if}
			</li>
		{/each}
	</ul>

	<label class="nobody">
		<input
			type="checkbox"
			name="nobodyWon"
			bind:checked={nobodyWon}
			onchange={() => {
				if (nobodyWon) winners = [];
				winnersTouched = true;
			}}
		/>
		Nobody won (we lost against the game)
	</label>

	<div class="times">
		<label class="field">
			<span>Started</span>
			<input type="time" name="start" bind:value={start} required />
		</label>
		<label class="field">
			<span>Ended</span>
			<input type="time" name="end" bind:value={end} oninput={() => (endTouched = true)} required />
		</label>
	</div>

	{#if error}
		<p class="error">{error}</p>
	{/if}
	<button class="button" disabled={busy}>{submitLabel}</button>
	<p class="hint muted">Points are optional. Tap 🏆 for each winner; several can win.</p>
</form>

<style>
	.rows {
		display: grid;
		gap: 8px;
		margin: 0 0 16px;
		padding: 0;
		list-style: none;
	}
	.rows li {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 8px 8px 10px;
		border: 2px solid transparent;
		border-radius: 14px;
		background: var(--surface);
	}
	.rows li.won {
		border-color: var(--accent);
	}
	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.score {
		width: 72px;
		padding: 10px;
		border: 2px solid var(--surface-2);
		border-radius: 10px;
		background: var(--bg);
		color: var(--text);
		font: inherit;
		font-size: 1.1rem;
		text-align: right;
	}
	.score:focus {
		outline: none;
		border-color: var(--accent);
	}
	.trophy {
		width: 48px;
		height: 48px;
		border: none;
		border-radius: 12px;
		background: var(--surface-2);
		font-size: 1.5rem;
		filter: grayscale(1);
		opacity: 0.45;
		cursor: pointer;
	}
	.trophy[aria-pressed='true'] {
		background: color-mix(in srgb, var(--accent) 25%, transparent);
		filter: none;
		opacity: 1;
	}
	.nobody {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 20px;
		color: var(--muted);
	}
	.nobody input {
		width: 22px;
		height: 22px;
		accent-color: var(--accent);
	}
	.times {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	input[type='time'] {
		width: 100%;
		padding: 12px;
		border: 2px solid var(--surface-2);
		border-radius: 12px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 1.1rem;
	}
	.hint {
		margin: 12px 0 0;
		font-size: 0.85rem;
		text-align: center;
	}
</style>
