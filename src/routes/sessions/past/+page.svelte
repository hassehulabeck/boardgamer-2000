<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import GameSelect from '#lib/components/GameSelect.svelte';
	import PlayerSelect from '#lib/components/PlayerSelect.svelte';
	import { formatDay, stockholmTime } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let day = $state('');
	let gameId = $state('');
	let playerIds = $state<string[]>([]);
	let winners = $state<string[]>([]);
	let nobodyWon = $state(false);
	let busy = $state(false);
	/** Sessions saved during this visit, newest first, so you can keep your place in the pile. */
	let logged = $state<{ id: string; title: string; day: string }[]>([]);

	const chosen = $derived(data.players.filter((p) => playerIds.includes(p.id)));
	const ready = $derived(
		day !== '' && gameId !== '' && playerIds.length > 0 && (nobodyWon || winners.length > 0)
	);

	// A winner who is unticked as a player is no longer a winner.
	$effect(() => {
		if (winners.some((id) => !playerIds.includes(id))) {
			winners = winners.filter((id) => playerIds.includes(id));
		}
	});

	function toggleWinner(id: string) {
		nobodyWon = false;
		winners = winners.includes(id) ? winners.filter((w) => w !== id) : [...winners, id];
	}

	const showDay = (key: string) => formatDay(stockholmTime(key, '12:00')!);
</script>

<svelte:head>
	<title>Log a past session · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<a class="back" href="/sessions" aria-label="Back to sessions">←</a>
	<h1>Log a past session</h1>
	<p class="muted intro">For games from before the app, like the paper records. Times are optional.</p>

	{#if data.games.length === 0}
		<p class="muted">There are no games in the library yet.</p>
		<a class="button" href="/games/new">+ Add a game first</a>
	{:else}
		<form
			method="post"
			use:enhance={() => {
				busy = true;
				return async ({ result, update }) => {
					await update({ reset: false });
					busy = false;
					if (result.type === 'success' && result.data?.saved) {
						const saved = result.data.saved as { id: string; day: string; gameId: string };
						const title = data.games.find((g) => g.id === saved.gameId)?.title ?? 'Session';
						logged = [{ id: saved.id, title, day: saved.day }, ...logged];
						// Paper records come in date order with the same crowd, so keep those.
						gameId = '';
						winners = [];
						nobodyWon = false;
						scrollTo({ top: 0, behavior: 'smooth' });
					}
				};
			}}
		>
			{#if logged.length > 0}
				<div class="logged" role="status">
					<strong>Saved ✓</strong> Next one! The date and players are kept.
					<ul>
						{#each logged as item (item.id)}
							<li><a href="/sessions/{item.id}">{showDay(item.day)} · {item.title}</a></li>
						{/each}
					</ul>
				</div>
			{/if}

			<label class="field">
				<span>When was it played?</span>
				<input type="date" name="day" bind:value={day} max={data.today} min="2000-01-01" required />
			</label>

			<h2>Which game?</h2>
			<GameSelect games={data.games} bind:selected={gameId} />

			<h2>Who played? <span class="muted">· {playerIds.length}</span></h2>
			<PlayerSelect players={data.players} bind:selected={playerIds} />

			<h2>Who won?</h2>
			{#if chosen.length === 0}
				<p class="muted">Pick the players first.</p>
			{:else}
				<ul class="winners">
					{#each chosen as player (player.id)}
						{@const won = winners.includes(player.id)}
						<li>
							<button type="button" class:won aria-pressed={won} onclick={() => toggleWinner(player.id)}>
								<Avatar name={player.name} color={player.color} src={player.avatarUrl} size={32} />
								<span>{player.name}</span>
								<span class="trophy" aria-hidden="true">🏆</span>
							</button>
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
						onchange={() => nobodyWon && (winners = [])}
					/>
					Nobody won (we lost against the game)
				</label>
			{/if}

			{#if form?.duplicate}
				<div class="duplicate" role="alert">
					<p>This one is already logged: same game, same players, same day.</p>
					<a class="button secondary" href="/sessions/{form.duplicate.id}">Open it</a>
					<button class="button" name="force" value="1" disabled={busy}>It's another one, save it</button>
				</div>
			{:else}
				{#if form?.error}
					<p class="error">{form.error}</p>
				{/if}
				<button class="button" disabled={busy || !ready}>Save session</button>
			{/if}
		</form>
	{/if}
</main>

<style>
	.intro {
		margin: 0 0 24px;
	}
	h2 {
		margin: 28px 0 12px;
		font-size: 1.15rem;
	}
	input[type='date'] {
		width: 100%;
		min-height: 52px;
		padding: 12px 14px;
		border: 2px solid var(--surface-2);
		border-radius: 12px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 1.1rem; /* 16px+ stops iOS from zooming into the field */
	}
	input[type='date']:focus {
		outline: none;
		border-color: var(--accent);
	}
	.winners {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.winners button {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 48px;
		padding: 6px 12px 6px 8px;
		border: 2px solid transparent;
		border-radius: 24px;
		background: var(--surface);
		color: inherit;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.winners button.won {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, var(--surface));
	}
	.trophy {
		filter: grayscale(1);
		opacity: 0.4;
	}
	.won .trophy {
		filter: none;
		opacity: 1;
	}
	.nobody {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		margin-top: 8px;
		color: var(--muted);
	}
	.nobody input {
		width: 22px;
		height: 22px;
		accent-color: var(--accent);
	}
	form > .button,
	form > .error {
		margin-top: 28px;
	}
	.duplicate {
		display: grid;
		gap: 10px;
		margin-top: 28px;
		padding: 16px;
		border-radius: 14px;
		background: color-mix(in srgb, var(--accent) 15%, var(--surface));
	}
	.duplicate p {
		margin: 0 0 6px;
	}
	.logged {
		margin-bottom: 24px;
		padding: 14px 16px;
		border-radius: 14px;
		background: color-mix(in srgb, #06d6a0 15%, var(--surface));
	}
	.logged strong {
		color: #06d6a0;
	}
	.logged ul {
		margin: 8px 0 0;
		padding-left: 18px;
		font-size: 0.9rem;
	}
	.logged a {
		color: var(--text);
	}
</style>
