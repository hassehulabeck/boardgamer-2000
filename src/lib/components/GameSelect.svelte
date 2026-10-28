<script lang="ts">
	import GameImage from '#lib/components/GameImage.svelte';
	import type { GameSummary } from '#lib/games.js';

	type Props = { games: GameSummary[]; selected: string };

	let { games, selected = $bindable() }: Props = $props();
</script>

<ul class="games">
	{#each games as game (game.id)}
		<li>
			<label class:on={selected === game.id}>
				<input type="radio" name="gameId" value={game.id} bind:group={selected} />
				<GameImage title={game.title} src={game.imageUrl} size={72} />
				<span>{game.title}</span>
			</label>
		</li>
	{/each}
</ul>

<style>
	.games {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	label {
		display: grid;
		justify-items: center;
		gap: 8px;
		height: 100%;
		padding: 12px 6px;
		border: 2px solid transparent;
		border-radius: 14px;
		background: var(--surface);
		text-align: center;
		cursor: pointer;
	}
	label.on {
		border-color: var(--accent);
	}
	label:has(input:focus-visible) {
		outline: 2px solid var(--text);
	}
	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	span {
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1.2;
	}
</style>
