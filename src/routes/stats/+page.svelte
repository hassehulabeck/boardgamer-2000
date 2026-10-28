<script lang="ts">
	import Avatar from '#lib/components/Avatar.svelte';
	import GameImage from '#lib/components/GameImage.svelte';
	import StatRow from '#lib/components/StatRow.svelte';
	import StatTile from '#lib/components/StatTile.svelte';
	import { formatDuration, formatHours, formatPercent } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const stats = $derived(data.stats);
	const maxPlays = $derived(Math.max(0, ...stats.games.map((g) => g.plays)));
	const maxWins = $derived(Math.max(0, ...stats.players.map((p) => p.wins)));
	const maxDay = $derived(Math.max(0, ...stats.weekdays.map((w) => w.sessions)));
	const busiest = $derived(stats.weekdays.filter((w) => w.sessions > 0));
</script>

<svelte:head>
	<title>Stats · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<a class="back" href="/" aria-label="Back to start">←</a>
	<h1>Stats</h1>

	{#if stats.sessions === 0}
		<p class="muted">No finished games yet. Play one and the numbers show up here.</p>
	{:else}
		<div class="tiles">
			<StatTile value={stats.sessions} label={stats.sessions === 1 ? 'game played' : 'games played'} />
			<StatTile value={formatHours(stats.totalMs)} label="at the table" />
			<StatTile value={stats.days} label={stats.days === 1 ? 'game day' : 'game days'} />
		</div>

		<a class="wrapped" href="/stats/wrapped/{data.year}">
			<span aria-hidden="true">✨</span>
			<span>
				<strong>{data.year} Wrapped</strong>
				<small>The year in games, for the group and for you</small>
			</span>
		</a>

		<section>
			<h2>Most played</h2>
			<ul class="rows">
				{#each stats.games as record (record.game.id)}
					<li>
						<StatRow
							href="/stats/games/{record.game.id}"
							title={record.game.title}
							value={record.plays}
							bar={{ value: record.plays, max: maxPlays }}
							note="≈ {formatDuration(record.totalMs / record.plays)} a game"
						>
							{#snippet image()}
								<GameImage title={record.game.title} src={record.game.imageUrl} size={40} />
							{/snippet}
						</StatRow>
					</li>
				{/each}
			</ul>
		</section>

		<section>
			<h2>Most wins</h2>
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

		<section>
			<h2>By weekday</h2>
			<div class="week" role="img" aria-label="Games played per weekday">
				{#each stats.weekdays as weekday (weekday.day)}
					<div class="day">
						<span class="count">{weekday.sessions || ''}</span>
						<span class="column">
							<span class="column-fill" style:height="{maxDay ? (weekday.sessions / maxDay) * 100 : 0}%"></span>
						</span>
						<span class="muted">{weekday.day}</span>
					</div>
				{/each}
			</div>
			<ul class="what">
				{#each busiest as weekday (weekday.day)}
					<li>
						<strong>{weekday.day}</strong>
						<span class="muted">
							{weekday.topGames.map((g) => `${g.title} ×${g.plays}`).join(', ')}
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>

<style>
	.tiles {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 20px;
	}
	section {
		margin-top: 28px;
	}
	.wrapped {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-top: 12px;
		padding: 14px 16px;
		border-radius: 14px;
		background: linear-gradient(120deg, color-mix(in srgb, #9b5de5 45%, var(--surface)), var(--surface));
		color: inherit;
		font-size: 1.6rem;
		text-decoration: none;
	}
	.wrapped span:last-child {
		display: grid;
		font-size: 1rem;
	}
	.wrapped small {
		color: var(--muted);
	}
	h2 {
		margin: 0 0 10px;
		color: var(--muted);
		font-size: 0.95rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.rows {
		display: grid;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.week {
		display: flex;
		gap: 8px;
		height: 140px;
		padding: 12px;
		border-radius: 14px;
		background: var(--surface);
	}
	.day {
		display: grid;
		grid-template-rows: auto 1fr auto;
		flex: 1;
		justify-items: center;
		gap: 4px;
		font-size: 0.85rem;
	}
	.count {
		min-height: 1.2em;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.column {
		display: flex;
		align-items: flex-end;
		width: 100%;
		max-width: 36px;
	}
	.column-fill {
		width: 100%;
		border-radius: 4px 4px 0 0;
		background: var(--accent);
	}
	.what {
		display: grid;
		gap: 6px;
		margin: 12px 0 0;
		padding: 0;
		list-style: none;
		font-size: 0.9rem;
	}
	.what strong {
		display: inline-block;
		width: 40px;
	}
</style>
