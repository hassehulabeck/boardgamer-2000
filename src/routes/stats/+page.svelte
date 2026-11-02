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

	// A 1-of-1 player shouldn't top the percent list, so few plays rank below everyone else.
	const MIN_PLAYS_FOR_RATE = 3;
	const MODE_KEY = 'bg.winsMode';

	let byRate = $state(false);
	$effect(() => {
		try {
			byRate = localStorage.getItem(MODE_KEY) === 'rate';
		} catch {
			// Storage blocked: start on wins every time.
		}
	});
	function setMode(rate: boolean) {
		byRate = rate;
		try {
			localStorage.setItem(MODE_KEY, rate ? 'rate' : 'wins');
		} catch {
			// Not remembered, that's fine.
		}
	}

	const rate = (p: { wins: number; plays: number }) => (p.plays ? p.wins / p.plays : 0);
	const winners = $derived(
		byRate
			? [...stats.players].sort(
					(a, b) =>
						Number(b.plays >= MIN_PLAYS_FOR_RATE) - Number(a.plays >= MIN_PLAYS_FOR_RATE) ||
						rate(b) - rate(a) ||
						b.plays - a.plays ||
						a.player.name.localeCompare(b.player.name)
				)
			: stats.players
	);
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
			<StatTile value={stats.sessions} label={stats.sessions === 1 ? 'session' : 'sessions'} />
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

		<a class="wrapped compare" href="/stats/compare">
			<span aria-hidden="true">⚖️</span>
			<span>
				<strong>Compare players</strong>
				<small>Who wins when these people play together?</small>
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
							note={record.timedPlays
								? `≈ ${formatDuration(record.totalMs / record.timedPlays)} a game`
								: undefined}
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
			<div class="heading">
				<h2>{byRate ? 'Best win rate' : 'Most wins'}</h2>
				<div class="mode" role="group" aria-label="Show wins as">
					<button type="button" class:on={!byRate} aria-pressed={!byRate} onclick={() => setMode(false)}>
						Wins
					</button>
					<button type="button" class:on={byRate} aria-pressed={byRate} onclick={() => setMode(true)}>
						Win %
					</button>
				</div>
			</div>
			<ul class="rows">
				{#each winners as record (record.player.id)}
					<li>
						<StatRow
							href="/stats/players/{record.player.id}"
							title={record.player.name}
							value={byRate ? formatPercent(record.wins, record.plays) : record.wins}
							bar={byRate
								? { value: rate(record), max: 1 }
								: { value: record.wins, max: maxWins }}
							note={byRate
								? `${record.wins} of ${record.plays}${record.plays < MIN_PLAYS_FOR_RATE ? ' · too few games to rank' : ''}`
								: `${record.wins} of ${record.plays} · ${formatPercent(record.wins, record.plays)}`}
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
	.compare {
		margin-top: 8px;
		background: var(--surface);
	}
	.wrapped small {
		color: var(--muted);
	}
	.heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 10px;
	}
	.heading h2 {
		margin: 0;
	}
	.mode {
		display: flex;
		gap: 2px;
		padding: 3px;
		border-radius: 12px;
		background: var(--surface);
	}
	.mode button {
		min-width: 64px;
		min-height: 44px;
		padding: 0 12px;
		border: 0;
		border-radius: 9px;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}
	.mode button.on {
		background: var(--surface-2);
		color: var(--text);
	}
	.mode button:focus-visible {
		outline: 2px solid var(--accent);
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
