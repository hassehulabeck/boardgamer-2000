<script lang="ts">
	import Avatar from '#lib/components/Avatar.svelte';
	import GameImage from '#lib/components/GameImage.svelte';
	import { formatDay, formatHours, formatPercent, WEEKDAY_NAMES, WEEKDAYS } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const w = $derived(data.wrapped);
	let track: HTMLElement | undefined = $state();
	let index = $state(0);
	let count = $state(0);

	$effect(() => {
		// Re-count when the year (and so the set of cards) changes.
		void w;
		count = track?.querySelectorAll('.slide').length ?? 0;
		index = 0;
		track?.scrollTo({ left: 0 });
	});

	/** Tapping the left or right side of a card moves back or forward, like stories. */
	function tap(event: MouseEvent) {
		if (!track || (event.target as Element).closest('a, button')) return;
		const forward = event.clientX > window.innerWidth / 3;
		track.scrollBy({ left: forward ? track.clientWidth : -track.clientWidth, behavior: 'smooth' });
	}

	function ordinal(n: number) {
		const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
		return `${n}${suffix}`;
	}
	const weekday = $derived(w.empty ? '' : WEEKDAY_NAMES[WEEKDAYS.indexOf(w.busiestWeekday.day)]);
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
</script>

<svelte:head>
	<title>{w.year} Wrapped · Boardgamer 2000</title>
</svelte:head>

<a class="close" href="/stats" aria-label="Close">×</a>

{#if w.empty}
	<main class="page empty">
		<h1>{w.year} Wrapped</h1>
		<p class="muted">No finished games in {w.year}.</p>
		{#each w.years as year (year)}
			<a class="button secondary" href="/stats/wrapped/{year}">{year} Wrapped</a>
		{/each}
	</main>
{:else}
	<div class="dots" aria-hidden="true">
		{#each { length: count } as _, i (i)}
			<span class:on={i <= index}></span>
		{/each}
	</div>

	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -- swiping and scrolling work too -->
	<main
		class="track"
		bind:this={track}
		onclick={tap}
		onscroll={() => track && (index = Math.round(track.scrollLeft / track.clientWidth))}
	>
		<section class="slide" style:--glow="#ffd166">
			<p class="kicker">Boardgamer Wrapped</p>
			<p class="huge">{w.year}</p>
			<p class="sub">A year of lunch-time games. Tap or swipe →</p>
		</section>

		<section class="slide" style:--glow="#4cc9f0">
			<p class="kicker">Together we played</p>
			<p class="huge">{w.sessions}</p>
			<p class="big">{w.sessions === 1 ? 'game' : 'games'}</p>
			<p class="sub">
				{formatHours(w.totalMs)} at the table, over {w.days === 1 ? '1 lunch' : `${w.days} lunches`} with
				{plural(w.playerCount, 'player')}.
			</p>
		</section>

		{#if w.topGames[0]}
			{@const top = w.topGames[0]}
			<section class="slide" style:--glow="#06d6a0">
				<p class="kicker">Game of the year</p>
				<GameImage title={top.game.title} src={top.game.imageUrl} size={160} />
				<p class="big">{top.game.title}</p>
				<p class="sub">{plural(top.plays, 'play')}</p>
				{#if w.topGames.length > 1}
					<ol class="runners" start="2">
						{#each w.topGames.slice(1) as record (record.game.id)}
							<li>{record.game.title} · {record.plays}</li>
						{/each}
					</ol>
				{/if}
			</section>
		{/if}

		<section class="slide" style:--glow="#9b5de5">
			<p class="kicker">Our favorite day</p>
			<p class="huge">{weekday.slice(0, 3)}</p>
			<p class="sub">{plural(w.busiestWeekday.sessions, 'game')} played on {weekday}s.</p>
			{#if w.biggestDay.sessions > 1}
				<p class="sub">
					Biggest day: {formatDay(w.biggestDay.date)}, with {w.biggestDay.sessions} games in one lunch.
				</p>
			{/if}
		</section>

		{#if w.longest}
			<section class="slide" style:--glow="#ff9f1c">
				<p class="kicker">The marathon</p>
				<p class="huge">{Math.round(w.longest.lengthMs / 60_000)}</p>
				<p class="big">minutes</p>
				<p class="sub">of {w.longest.game.title} on {formatDay(w.longest.date)}. Was anyone late back?</p>
			</section>
		{/if}

		{#if w.champion && w.champion.wins > 0}
			{@const champ = w.champion}
			<section class="slide" style:--glow={champ.player.color}>
				<p class="kicker">Champion of {w.year}</p>
				<Avatar name={champ.player.name} color={champ.player.color} src={champ.player.avatarUrl} size={140} />
				<p class="big">{champ.player.name}</p>
				<p class="sub">
					{plural(champ.wins, 'win')} in {plural(champ.plays, 'game')} ({formatPercent(champ.wins, champ.plays)})
				</p>
				{#if w.mostActive && w.mostActive.player.id !== champ.player.id}
					<p class="sub">Most at the table: {w.mostActive.player.name}, with {w.mostActive.plays} games.</p>
				{/if}
			</section>
		{/if}

		{#if w.me}
			{@const me = w.me}
			<section class="slide" style:--glow={data.me?.color ?? '#ffd166'}>
				<p class="kicker">And you?</p>
				<p class="huge">{me.plays}</p>
				<p class="big">{me.plays === 1 ? 'game' : 'games'}, {plural(me.wins, 'win')}</p>
				<p class="sub">
					{formatHours(me.totalMs)} at the table.
					{me.rank === 1 ? 'Nobody played more!' : `The ${ordinal(me.rank)} most active player.`}
				</p>
			</section>

			{#if me.topGame}
				<section class="slide" style:--glow="#f15bb5">
					<p class="kicker">Your game</p>
					<GameImage title={me.topGame.game.title} src={me.topGame.game.imageUrl} size={160} />
					<p class="big">{me.topGame.game.title}</p>
					<p class="sub">
						{plural(me.topGame.plays, 'play')}, {plural(me.topGame.wins, 'win')}.
						{#if me.bestStreak > 1}Best run: {me.bestStreak} wins in a row.{/if}
					</p>
				</section>
			{/if}

			{#if me.sidekick}
				<section class="slide" style:--glow={me.sidekick.opponent.color}>
					<p class="kicker">Your sidekick</p>
					<Avatar
						name={me.sidekick.opponent.name}
						color={me.sidekick.opponent.color}
						src={me.sidekick.opponent.avatarUrl}
						size={120}
					/>
					<p class="big">{me.sidekick.opponent.name}</p>
					<p class="sub">{plural(me.sidekick.together, 'game')} together.</p>
					{#if me.nemesis}
						<div class="nemesis">
							<Avatar
								name={me.nemesis.opponent.name}
								color={me.nemesis.opponent.color}
								src={me.nemesis.opponent.avatarUrl}
								size={56}
							/>
							<p>
								<strong>Nemesis: {me.nemesis.opponent.name}</strong><br />
								<span>beat you {me.nemesis.theirWins} – {me.nemesis.myWins}</span>
							</p>
						</div>
					{/if}
				</section>
			{/if}
		{/if}

		<section class="slide" style:--glow="#ffd166">
			<p class="kicker">That was {w.year}</p>
			<p class="big">See you at the table 🎲</p>
			<div class="outro">
				<a class="button" href="/stats">All stats</a>
				{#each w.years.filter((y) => y !== w.year) as year (year)}
					<a class="button secondary" href="/stats/wrapped/{year}">{year} Wrapped</a>
				{/each}
			</div>
		</section>
	</main>
{/if}

<style>
	.close {
		position: fixed;
		z-index: 2;
		top: calc(env(safe-area-inset-top) + 20px);
		right: 16px;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: rgb(0 0 0 / 0.35);
		color: var(--text);
		font-size: 1.8rem;
		text-decoration: none;
	}
	.empty {
		display: grid;
		gap: 12px;
	}
	.dots {
		position: fixed;
		z-index: 2;
		top: calc(env(safe-area-inset-top) + 8px);
		left: 16px;
		right: 16px;
		display: flex;
		gap: 4px;
		max-width: 448px;
		margin: 0 auto;
	}
	.dots span {
		flex: 1;
		height: 3px;
		border-radius: 2px;
		background: rgb(255 255 255 / 0.25);
	}
	.dots span.on {
		background: var(--text);
	}
	.track {
		display: flex;
		height: 100dvh;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
	}
	.slide {
		display: flex;
		flex: 0 0 100%;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: calc(env(safe-area-inset-top) + 72px) 24px calc(env(safe-area-inset-bottom) + 48px);
		scroll-snap-align: start;
		scroll-snap-stop: always;
		/* Each card glows in its own color; text stays on the dark base for contrast. */
		background:
			radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--glow) 38%, transparent), transparent 65%),
			var(--bg);
		text-align: center;
		user-select: none;
	}
	.slide p {
		margin: 0;
		max-width: 400px;
	}
	.kicker {
		color: var(--muted);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.huge {
		font-size: clamp(3.5rem, 22vw, 6.5rem);
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.big {
		margin-top: 8px !important;
		font-size: 1.8rem;
		font-weight: 800;
		line-height: 1.15;
	}
	.sub {
		color: var(--text);
		font-size: 1.1rem;
		opacity: 0.85;
	}
	.runners {
		margin: 16px 0 0;
		padding: 0;
		color: var(--muted);
		list-style-position: inside;
	}
	.nemesis {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 28px;
		padding: 12px 16px;
		border-radius: 16px;
		background: rgb(0 0 0 / 0.3);
		text-align: left;
	}
	.nemesis span {
		color: var(--muted);
	}
	.outro {
		display: grid;
		gap: 8px;
		width: 100%;
		max-width: 320px;
		margin-top: 24px;
	}
</style>
