<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import GameSelect from '#lib/components/GameSelect.svelte';
	import PlayerSelect from '#lib/components/PlayerSelect.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let gameId = $state('');
	// svelte-ignore state_referenced_locally -- a lunch slot passes its people; else it's probably you
	let playerIds = $state<string[]>(initialPlayers());
	let busy = $state(false);

	/** `?players=a,b,c` from a lunch slot, or just you. */
	function initialPlayers(): string[] {
		const wanted = page.url.searchParams.get('players')?.split(',') ?? [];
		const known = wanted.filter((id) => data.players.some((p) => p.id === id));
		if (known.length > 0) return known;
		return data.me ? [data.me.id] : [];
	}
</script>

<svelte:head>
	<title>New game · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<a class="back" href="/" aria-label="Back to start">←</a>
	<h1>New game</h1>

	{#if data.games.length === 0}
		<p class="muted">There are no games in the library yet.</p>
		<a class="button" href="/games/new">+ Add a game first</a>
	{:else}
		<form
			method="post"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update({ reset: false });
					busy = false;
				};
			}}
		>
			<h2>What are you playing?</h2>
			<GameSelect games={data.games} bind:selected={gameId} />

			<h2>Who's playing? <span class="muted">· {playerIds.length}</span></h2>
			<PlayerSelect players={data.players} bind:selected={playerIds} />

			{#if form?.duplicate}
				<div class="duplicate" role="alert">
					<p>
						<strong>{form.duplicate.createdByName ?? 'Someone'}</strong> just created a
						<strong>{form.duplicate.gameTitle}</strong> session with some of these players.
					</p>
					<a class="button" href="/sessions/{form.duplicate.id}">Open that one</a>
					<button class="button secondary" name="force" value="1" disabled={busy}>Create a new one anyway</button>
				</div>
			{:else}
				{#if form?.error}
					<p class="error">{form.error}</p>
				{/if}
				<button class="button" disabled={busy || !gameId || playerIds.length === 0}>
					Create session
				</button>
			{/if}
		</form>
	{/if}
</main>

<style>
	h2 {
		margin: 28px 0 12px;
		font-size: 1.15rem;
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
</style>
