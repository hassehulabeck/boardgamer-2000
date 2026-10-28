<script lang="ts">
	import Avatar from '#lib/components/Avatar.svelte';
	import GameImage from '#lib/components/GameImage.svelte';
	import StatRow from '#lib/components/StatRow.svelte';
	import StatTile from '#lib/components/StatTile.svelte';
	import { formatHours, formatPercent } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const stats = $derived(data.stats);
	const player = $derived(stats.player);
	const isMe = $derived(data.me?.id === player.id);
	const maxPlays = $derived(Math.max(0, ...stats.favorites.map((g) => g.plays)));
	const games = (n: number) => (n === 1 ? '1 game' : `${n} games`);
</script>

<svelte:head>
	<title>{player.name} · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<a class="back" href="/stats" aria-label="Back to stats">←</a>
	<header>
		<Avatar name={player.name} color={player.color} src={player.avatarUrl} size={64} />
		<div>
			<h1>{player.name}</h1>
			{#if isMe}
				<a class="muted" href="/profile">Edit profile</a>
			{/if}
		</div>
	</header>

	{#if stats.plays === 0}
		<p class="muted">{isMe ? "You haven't" : `${player.name} hasn't`} finished a game yet.</p>
	{:else}
		<div class="tiles">
			<StatTile value={stats.plays} label="played" />
			<StatTile value={stats.wins} label={stats.wins === 1 ? 'win' : 'wins'} />
			<StatTile value={formatPercent(stats.wins, stats.plays)} label="win rate" />
			<StatTile
				value={stats.streaks.current}
				label="win streak"
				note={`Best ever: ${stats.streaks.best}`}
			/>
			<StatTile value={formatHours(stats.totalMs)} label="at the table" />
			<StatTile
				value={stats.started}
				label="times first"
				note={stats.favoriteDay ? `Plays most on ${stats.favoriteDay}` : undefined}
			/>
		</div>

		<section>
			<h2>Favorite games</h2>
			<ul class="rows">
				{#each stats.favorites as record (record.game.id)}
					<li>
						<StatRow
							href="/stats/games/{record.game.id}"
							title={record.game.title}
							value={record.plays}
							bar={{ value: record.plays, max: maxPlays }}
							note="Won {record.wins} of {record.plays} · {formatPercent(record.wins, record.plays)}"
						>
							{#snippet image()}
								<GameImage title={record.game.title} src={record.game.imageUrl} size={40} />
							{/snippet}
						</StatRow>
					</li>
				{/each}
			</ul>
		</section>

		{#if stats.headToHead.length > 0}
			<section>
				<h2>Head to head</h2>
				<p class="muted hint">
					Wins in games played together: {isMe ? 'you' : player.name} – them.
				</p>
				<ul class="rows">
					{#each stats.headToHead as h2h (h2h.opponent.id)}
						<li>
							<StatRow
								href="/stats/players/{h2h.opponent.id}"
								title={h2h.opponent.name}
								value="{h2h.myWins} – {h2h.theirWins}"
								note="{games(h2h.together)} together"
							>
								{#snippet image()}
									<Avatar
										name={h2h.opponent.name}
										color={h2h.opponent.color}
										src={h2h.opponent.avatarUrl}
										size={40}
									/>
								{/snippet}
							</StatRow>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
</main>

<style>
	header {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 20px;
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
	.hint {
		margin: -4px 0 10px;
		font-size: 0.85rem;
	}
	.rows {
		display: grid;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
</style>
