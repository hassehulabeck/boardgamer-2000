<script lang="ts">
	import Avatar from '#lib/components/Avatar.svelte';
	import type { PlayerSummary } from '#lib/players.js';

	type Props = { players: PlayerSummary[]; selected: string[] };

	let { players, selected = $bindable() }: Props = $props();
</script>

<ul class="players">
	{#each players as player (player.id)}
		<li>
			<label class:on={selected.includes(player.id)}>
				<input type="checkbox" name="playerId" value={player.id} bind:group={selected} />
				<Avatar name={player.name} color={player.color} src={player.avatarUrl} size={52} />
				<span>{player.name}</span>
			</label>
		</li>
	{/each}
</ul>

<style>
	.players {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	label {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 12px 4px;
		border: 2px solid transparent;
		border-radius: 14px;
		background: var(--surface);
		cursor: pointer;
		opacity: 0.55;
		transition: opacity 120ms;
	}
	label.on {
		border-color: var(--accent);
		opacity: 1;
	}
	label.on::after {
		content: '✓';
		position: absolute;
		top: 6px;
		right: 8px;
		color: var(--accent);
		font-weight: 800;
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
		max-width: 100%;
		overflow: hidden;
		font-size: 0.9rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
