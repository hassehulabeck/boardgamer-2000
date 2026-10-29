<script lang="ts">
	import Avatar from '#lib/components/Avatar.svelte';
	import GameImage from '#lib/components/GameImage.svelte';
	import { formatDuration, formatTime } from '#lib/format.js';
	import { hasNoTimes, isUnfinished, type SessionDetail } from '#lib/sessions.js';

	type Props = { session: SessionDetail };

	let { session }: Props = $props();

	const status = $derived.by(() => {
		if (session.status === 'draft') return 'Not started';
		if (isUnfinished(session)) return 'Never finished';
		if (session.status === 'playing') return `Playing since ${formatTime(session.startedAt!)}`;
		if (hasNoTimes(session)) return 'Time not recorded';
		const length = session.endedAt!.getTime() - session.startedAt!.getTime();
		return `${formatTime(session.startedAt!)} · ${formatDuration(length)}`;
	});
	const winners = $derived(session.players.filter((p) => p.isWinner));
</script>

<a class="card" href="/sessions/{session.id}" class:live={session.status !== 'finished'}>
	<GameImage title={session.game.title} src={session.game.imageUrl} size={56} />
	<span class="body">
		<strong>{session.game.title}</strong>
		<small class="muted">{status}</small>
		<span class="players">
			{#each session.players as player (player.id)}
				<span class="player" class:winner={player.isWinner}>
					<Avatar name={player.name} color={player.color} src={player.avatarUrl} size={26} />
				</span>
			{/each}
		</span>
	</span>
	{#if session.status === 'finished'}
		<span class="result">
			{#if winners.length > 0}
				🏆 <span>{winners.map((w) => w.name).join(', ')}</span>
			{:else}
				<span class="muted">No winner</span>
			{/if}
		</span>
	{/if}
</a>

<style>
	.card {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px 10px 10px;
		border-radius: 14px;
		background: var(--surface);
		color: inherit;
		text-decoration: none;
	}
	.card.live {
		box-shadow: inset 0 0 0 2px var(--accent);
	}
	.body {
		display: grid;
		flex: 1;
		gap: 2px;
		min-width: 0;
	}
	strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.players {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 4px;
	}
	.player.winner {
		border-radius: 50%;
		box-shadow: 0 0 0 2px var(--accent);
	}
	.result {
		max-width: 38%;
		overflow: hidden;
		font-weight: 600;
		font-size: 0.9rem;
		text-align: right;
		text-overflow: ellipsis;
	}
</style>
