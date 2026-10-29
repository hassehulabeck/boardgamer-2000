<script lang="ts">
	import Avatar from '#lib/components/Avatar.svelte';
	import GameImage from '#lib/components/GameImage.svelte';
	import StatRow from '#lib/components/StatRow.svelte';
	import StatTile from '#lib/components/StatTile.svelte';
	import { formatDuration, formatPercent, formatRelativeDay } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const game = $derived(data.game);
	const stats = $derived(data.stats);
	const maxWins = $derived(Math.max(0, ...stats.players.map((p) => p.wins)));

	/** "27–58 min", or the full form once games run past an hour. */
	const lengthRange = $derived.by(() => {
		const { shortestMs, longestMs } = stats;
		if (shortestMs === null || longestMs === null || stats.timedPlays < 2) return undefined;
		return longestMs < 59.5 * 60_000
			? `${Math.round(shortestMs / 60_000)}–${formatDuration(longestMs)}`
			: `${formatDuration(shortestMs)} – ${formatDuration(longestMs)}`;
	});

	/** With few games, any difference is just luck, so don't claim one. */
	const verdict = $derived.by(() => {
		const start = stats.startingPlayer;
		if (!start) return null;
		if (start.sessions < 5) return 'Too few games to tell yet';
		const diff = start.wins / start.sessions - start.expected;
		if (diff > 0.1) return 'Going first seems to help';
		if (diff < -0.1) return 'Going first seems to hurt';
		return 'No clear advantage';
	});
</script>

<svelte:head>
	<title>{game.title} stats · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<a class="back" href="/stats" aria-label="Back to stats">←</a>
	<header>
		<GameImage title={game.title} src={game.imageUrl} size={64} />
		<div>
			<h1>{game.title}</h1>
			<a class="muted" href="/games/{game.id}">Edit game</a>
		</div>
	</header>

	{#if stats.plays === 0}
		<p class="muted">Nobody has finished a game of {game.title} yet.</p>
	{:else}
		<div class="tiles">
			<StatTile value={stats.plays} label={stats.plays === 1 ? 'play' : 'plays'} />
			<StatTile
				value={stats.averageMs === null ? '–' : formatDuration(stats.averageMs)}
				label="on average"
				note={stats.averageMs === null ? 'No times recorded' : lengthRange}
			/>
			<StatTile value={formatRelativeDay(stats.lastPlayed!)} label="last played" />
		</div>

		{#if stats.startingPlayer}
			{@const start = stats.startingPlayer}
			<section>
				<h2>Starting player</h2>
				<div class="card">
					<strong>{verdict}</strong>
					<p class="muted">
						The starting player won {start.wins} of {start.sessions}
						({formatPercent(start.wins, start.sessions)}). By pure chance it would be about
						{formatPercent(start.expected, 1)}.
					</p>
				</div>
			</section>
		{/if}

		{#if stats.highScore}
			{@const high = stats.highScore}
			<section>
				<h2>High score</h2>
				<div class="card high">
					<Avatar name={high.player.name} color={high.player.color} src={high.player.avatarUrl} size={40} />
					<span>
						<strong>{high.score} points</strong>
						<span class="muted">{high.player.name} · {formatRelativeDay(high.date)}</span>
					</span>
				</div>
			</section>
		{/if}

		<section>
			<h2>Top winners</h2>
			<ul class="rows">
				{#each stats.players as record (record.player.id)}
					<li>
						<StatRow
							href="/stats/players/{record.player.id}"
							title={record.player.name}
							value={record.wins}
							bar={{ value: record.wins, max: maxWins }}
							note="{record.wins} of {record.plays} · {formatPercent(record.wins, record.plays)}"
						>
							{#snippet image()}
								<Avatar
									name={record.player.name}
									color={record.player.color}
									src={record.player.avatarUrl}
									size={40}
								/>
							{/snippet}
						</StatRow>
					</li>
				{/each}
			</ul>
		</section>
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
		line-height: 1.15;
	}
	header a {
		font-size: 0.9rem;
	}
	.tiles {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}
	section {
		margin-top: 28px;
	}
	h2 {
		margin: 0 0 10px;
		color: var(--muted);
		font-size: 0.95rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.card {
		padding: 14px;
		border-radius: 14px;
		background: var(--surface);
	}
	.card p {
		margin: 4px 0 0;
		font-size: 0.9rem;
	}
	.high {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.high > span {
		display: grid;
	}
	.rows {
		display: grid;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
</style>
