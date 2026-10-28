<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SlotList } from '#lib/availability.js';
	import Avatar from './Avatar.svelte';

	type Props = { slots: SlotList; meId: string | null };

	let { slots, meId }: Props = $props();

	let busy = $state(false);
	const total = $derived(slots.reduce((sum, s) => sum + s.players.length, 0));
</script>

<section>
	<h2>Lunch today <span class="muted">· {total === 1 ? '1 player' : `${total} players`}</span></h2>
	<p class="muted hint">Tap the time you'll be there. Tap it again if you can't make it.</p>
	<ul>
		{#each slots as { slot, players } (slot)}
			{@const mine = players.some((p) => p.id === meId)}
			<li class:mine>
				<form
					method="post"
					action="?/lunch"
					use:enhance={() => {
						busy = true;
						return async ({ update }) => {
							await update();
							busy = false;
						};
					}}
				>
					<button name="slot" value={mine ? '' : slot} disabled={busy} aria-pressed={mine}>
						<span class="time">{slot}</span>
						<span class="who">
							{#each players as player (player.id)}
								<Avatar name={player.name} color={player.color} src={player.avatarUrl} size={30} />
							{:else}
								<span class="muted">–</span>
							{/each}
						</span>
						{#if players.length > 0}
							<span class="count">{players.length}</span>
						{/if}
					</button>
				</form>
				{#if players.length >= 2}
					<a class="start" href="/sessions/new?players={players.map((p) => p.id).join(',')}">
						Start a session with {players.length === 2 ? 'both' : `these ${players.length}`} →
					</a>
				{/if}
			</li>
		{/each}
	</ul>
</section>

<style>
	section {
		margin-bottom: 24px;
	}
	h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.hint {
		margin: 2px 0 10px;
		font-size: 0.85rem;
	}
	ul {
		display: grid;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		border-radius: 12px;
		background: var(--surface);
	}
	li.mine {
		box-shadow: inset 0 0 0 2px var(--accent);
	}
	button {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 52px;
		padding: 8px 12px;
		border: none;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	button:disabled {
		cursor: progress;
	}
	.time {
		flex: none;
		width: 3.2em;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.who {
		display: flex;
		flex: 1;
		flex-wrap: wrap;
		gap: 6px;
		min-width: 0;
	}
	.count {
		flex: none;
		color: var(--muted);
		font-weight: 700;
	}
	.start {
		display: flex;
		align-items: center;
		min-height: 44px;
		padding: 0 12px 4px calc(12px + 3.2em + 12px);
		color: var(--accent);
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
	}
</style>
