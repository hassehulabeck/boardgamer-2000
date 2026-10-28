<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Avatar from '#lib/components/Avatar.svelte';
	import GameImage from '#lib/components/GameImage.svelte';
	import PlayerSelect from '#lib/components/PlayerSelect.svelte';
	import StatRow from '#lib/components/StatRow.svelte';
	import StatTile from '#lib/components/StatTile.svelte';
	import { formatHours, formatPercent, formatRelativeDay } from '#lib/format.js';
	import { COMPARE_MAX_PLAYERS } from '#lib/players.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally -- starts from the URL, then the URL follows these
	let selected = $state([...data.selected]);
	// svelte-ignore state_referenced_locally
	let exact = $state(data.exact ? '1' : '');

	// Results update as you tap: the choice lives in the URL, so it can be shared and reloaded.
	$effect(() => {
		const params = new URLSearchParams(selected.map((id) => ['playerId', id]));
		if (exact) params.set('exact', '1');
		const search = params.size ? `?${params}` : '';
		if (search !== page.url.search) goto(search || '?', { replace: true, reset: false });
	});

	const c = $derived(data.compare);
	const maxWins = $derived(Math.max(0, ...(c?.records.map((r) => r.wins) ?? [])));
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

	/** "Someone else won 3 times. Nobody won once." for sessions none of them won. */
	const outcomes = $derived(
		[
			c?.othersWon ? `Someone else won ${plural(c.othersWon, 'time')}.` : '',
			c?.nobodyWon ? `Nobody won ${plural(c.nobodyWon, 'time')}.` : ''
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<svelte:head>
	<title>Compare players · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<a class="back" href="/stats" aria-label="Back to stats">←</a>
	<h1>Compare players</h1>
	<p class="muted intro">Who wins when these people play together?</p>

	<form method="get">
		<PlayerSelect players={data.players} bind:selected />
		<div class="mode" role="radiogroup" aria-label="Which sessions">
			<label class:on={!exact}>
				<input type="radio" name="exact" value="" bind:group={exact} />
				All sessions with them
			</label>
			<label class:on={!!exact}>
				<input type="radio" name="exact" value="1" bind:group={exact} />
				Only these players
			</label>
		</div>
		<noscript><button class="button">Compare</button></noscript>
	</form>

	{#if selected.length > COMPARE_MAX_PLAYERS}
		<p class="muted">Pick at most {COMPARE_MAX_PLAYERS} players.</p>
	{:else if !c}
		<p class="muted">Pick two or more players.</p>
	{:else if c.sessions === 0}
		<p class="muted">
			{exact
				? `They've never played a session with just the ${c.players.length} of them.`
				: "They haven't played a session together yet."}
		</p>
	{:else}
		<div class="tiles">
			<StatTile value={c.sessions} label={c.sessions === 1 ? 'session' : 'sessions'} />
			<StatTile value={formatHours(c.totalMs)} label="together" />
			<StatTile value={formatRelativeDay(c.lastPlayed!)} label="last time" />
		</div>

		<section>
			<h2>Who wins</h2>
			<ul class="rows">
				{#each c.records as record (record.player.id)}
					<li>
						<StatRow
							href="/stats/players/{record.player.id}"
							title={record.player.name}
							value={record.wins}
							bar={{ value: record.wins, max: maxWins }}
							note="{formatPercent(record.wins, c.sessions)} of sessions · started {plural(record.started, 'time')}"
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
			{#if outcomes}
				<p class="muted note">{outcomes}</p>
			{/if}
		</section>

		<section>
			<h2>What they play</h2>
			<ul class="rows">
				{#each c.games as record (record.game.id)}
					<li>
						<StatRow
							href="/stats/games/{record.game.id}"
							title={record.game.title}
							value={record.plays}
							note={record.leader
								? `${record.leader.player.name} leads with ${plural(record.leader.wins, 'win')}`
								: 'No clear leader'}
						>
							{#snippet image()}
								<GameImage title={record.game.title} src={record.game.imageUrl} size={40} />
							{/snippet}
						</StatRow>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>

<style>
	.intro {
		margin: 0 0 20px;
	}
	.mode {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
		margin: 12px 0 24px;
		padding: 4px;
		border-radius: 14px;
		background: var(--surface);
	}
	.mode label {
		display: grid;
		place-items: center;
		min-height: 44px;
		padding: 6px;
		border-radius: 10px;
		color: var(--muted);
		font-size: 0.9rem;
		font-weight: 600;
		text-align: center;
		cursor: pointer;
	}
	.mode label.on {
		background: var(--surface-2);
		color: var(--text);
	}
	.mode input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.mode label:has(input:focus-visible) {
		outline: 2px solid var(--accent);
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
	.rows {
		display: grid;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.note {
		margin: 10px 0 0;
		font-size: 0.85rem;
	}
</style>
