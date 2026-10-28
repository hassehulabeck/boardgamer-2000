<script lang="ts">
	import GameImage from '#lib/components/GameImage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Games · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<a class="back" href="/" aria-label="Back to start">←</a>
	<h1>Games <span class="muted">· {data.games.length}</span></h1>

	{#if data.games.length === 0}
		<p class="muted">No games yet. Add the ones you play!</p>
	{:else}
		<ul class="games">
			{#each data.games as game (game.id)}
				<li>
					<a href="/games/{game.id}">
						<GameImage title={game.title} src={game.imageUrl} size={56} />
						<span class="title">
							{game.title}
							<small class="muted">{game.plays === 1 ? '1 play' : `${game.plays} plays`}</small>
						</span>
						<span class="chevron" aria-hidden="true">›</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	<a class="button add" href="/games/new">+ Add game</a>
</main>

<style>
	.games {
		display: grid;
		gap: 8px;
		margin: 20px 0 24px;
		padding: 0;
		list-style: none;
	}
	.games a {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 10px 14px 10px 10px;
		border-radius: 14px;
		background: var(--surface);
		color: inherit;
		text-decoration: none;
	}
	.title {
		display: grid;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		font-weight: 600;
		font-size: 1.05rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.title small {
		font-weight: 400;
		font-size: 0.85rem;
	}
	.chevron {
		color: var(--muted);
		font-size: 1.5rem;
	}
	.add {
		margin-top: 20px;
	}
</style>
