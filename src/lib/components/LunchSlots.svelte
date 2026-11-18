<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { LunchDay, SlotList } from '#lib/availability.js';
	import { dayKeyDate, formatDayKey, WEEKDAYS, weekdayIndex } from '#lib/format.js';
	import Avatar from './Avatar.svelte';

	type Props = { slots: SlotList; meId: string | null; day: string; days: LunchDay[]; today: string };

	let { slots, meId, day, days, today }: Props = $props();

	let busy = $state(false);
	// Highlights the tapped day straight away, before its slots have loaded.
	let picked = $state<string | null>(null);
	const shown = $derived(picked ?? day);
	const total = $derived(slots.reduce((sum, s) => sum + s.players.length, 0));
	const isToday = $derived(day === today);

	let strip = $state<HTMLElement>();

	async function pick(event: MouseEvent, next: string) {
		event.preventDefault();
		if (next === shown) return;
		picked = next;
		try {
			await goto(`?day=${next}`, { replace: true, reset: false });
		} finally {
			picked = null;
		}
	}

	// A link to a day further on opens with that day scrolled into view.
	$effect(() => {
		const chip = strip?.querySelector<HTMLElement>('[aria-current="date"]');
		if (strip && chip && chip.offsetLeft + chip.offsetWidth > strip.clientWidth) {
			strip.scrollLeft = chip.offsetLeft - strip.clientWidth / 2 + chip.offsetWidth / 2;
		}
	});
</script>

<section>
	<h2>
		Lunch {isToday ? 'today' : formatDayKey(day)}
		<span class="muted">· {total === 1 ? '1 player' : `${total} players`}</span>
	</h2>
	<p class="muted hint">Pick a day, then tap the time you'll be there. Tap it again if you can't make it.</p>

	<nav class="days" aria-label="Lunch day" bind:this={strip}>
		{#each days as d, i (d.day)}
			{@const date = dayKeyDate(d.day)}
			{@const newWeek = i > 0 && weekdayIndex(date) < weekdayIndex(dayKeyDate(days[i - 1].day))}
			<a
				href="?day={d.day}"
				class:newWeek
				class:mine={d.mine}
				aria-current={d.day === shown ? 'date' : undefined}
				aria-label="{formatDayKey(d.day)}{d.count ? `, ${d.count} coming` : ''}{d.mine
					? ', you are in'
					: ''}"
				onclick={(e) => pick(e, d.day)}
			>
				<span class="weekday">{d.day === today ? 'Today' : WEEKDAYS[weekdayIndex(date)]}</span>
				<span class="date">{date.getUTCDate()}</span>
				<span class="count">{d.count || ''}</span>
			</a>
		{/each}
	</nav>

	<ul class:loading={picked !== null}>
		{#each slots as { slot, players } (slot)}
			{@const mine = players.some((p) => p.id === meId)}
			<li class:mine>
				<form
					method="post"
					action="?day={day}&/lunch"
					use:enhance={() => {
						busy = true;
						return async ({ update }) => {
							await update();
							busy = false;
						};
					}}
				>
					<input type="hidden" name="day" value={day} />
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
				{#if isToday && players.length >= 2}
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
	.days {
		display: flex;
		gap: 6px;
		margin: 0 -16px 10px;
		padding: 2px 16px;
		overflow-x: auto;
		scrollbar-width: none;
		scroll-padding-inline: 16px;
	}
	.days::-webkit-scrollbar {
		display: none;
	}
	.days a {
		display: grid;
		flex: none;
		justify-items: center;
		width: 52px;
		padding: 6px 0 4px;
		border-radius: 12px;
		background: var(--surface);
		color: inherit;
		text-decoration: none;
	}
	.days a.newWeek {
		margin-left: 10px;
	}
	.days a.mine {
		box-shadow: inset 0 0 0 2px var(--accent);
	}
	.days a[aria-current='date'] {
		background: var(--accent);
		color: var(--bg);
	}
	.weekday {
		font-size: 0.75rem;
		opacity: 0.8;
	}
	.date {
		font-size: 1.15rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 1.2;
	}
	.days .count {
		min-height: 1em;
		font-size: 0.75rem;
		line-height: 1;
	}
	ul {
		display: grid;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
		transition: opacity 0.15s;
	}
	ul.loading {
		opacity: 0.5;
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
	li .count {
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
