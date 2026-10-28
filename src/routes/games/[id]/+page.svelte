<script lang="ts">
	import { enhance } from '$app/forms';
	import GameForm from '#lib/components/GameForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.game.title} · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<a class="back" href="/games" aria-label="Back to games">←</a>
	<h1>{data.game.title}</h1>
	{#if data.game.bggUrl}
		<a class="bgg" href={data.game.bggUrl} target="_blank" rel="noopener noreferrer">
			Open on BoardGameGeek ↗
		</a>
	{/if}
	<a class="button secondary stats" href="/stats/games/{data.game.id}">📊 Stats</a>

	<h2>Edit</h2>
	{#key data.game.id}
		<GameForm game={data.game} action="?/save" error={form?.error} submitLabel="Save" />
	{/key}
	{#if form?.saved}
		<p class="saved">Saved ✓</p>
	{/if}

	<form
		class="delete"
		method="post"
		action="?/delete"
		use:enhance={({ cancel }) => {
			if (!confirm(`Delete ${data.game.title}?`)) cancel();
		}}
	>
		{#if form?.deleteError}
			<p class="error">{form.deleteError}</p>
		{/if}
		<button class="button danger">Delete game</button>
	</form>
</main>

<style>
	.bgg {
		color: var(--accent);
		font-weight: 600;
	}
	.stats {
		margin-top: 16px;
	}
	h2 {
		margin: 28px 0 16px;
		font-size: 1.2rem;
	}
	.saved {
		margin: 12px 0 0;
		color: #06d6a0;
		font-weight: 600;
	}
	.delete {
		margin-top: 48px;
	}
</style>
