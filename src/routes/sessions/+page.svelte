<script lang="ts">
	import SessionCard from '#lib/components/SessionCard.svelte';
	import { dayKey, formatRelativeDay } from '#lib/format.js';
	import type { SessionDetail } from '#lib/sessions.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** Finished sessions grouped by Swedish calendar day, newest first. */
	const days = $derived.by(() => {
		const groups: { key: string; label: string; sessions: SessionDetail[] }[] = [];
		for (const session of data.finished) {
			const key = dayKey(session.startedAt!);
			const last = groups.at(-1);
			if (last?.key === key) last.sessions.push(session);
			else groups.push({ key, label: formatRelativeDay(session.startedAt!), sessions: [session] });
		}
		return groups;
	});
</script>

<svelte:head>
	<title>Sessions · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<a class="back" href="/" aria-label="Back to start">←</a>
	<h1>Sessions</h1>

	<a class="button new" href="/sessions/new">+ New game</a>

	{#if data.active.length > 0}
		<section>
			<h2>Right now</h2>
			<ul>
				{#each data.active as session (session.id)}
					<li><SessionCard {session} /></li>
				{/each}
			</ul>
		</section>
	{/if}

	{#each days as day (day.key)}
		<section>
			<h2>{day.label}</h2>
			<ul>
				{#each day.sessions as session (session.id)}
					<li><SessionCard {session} /></li>
				{/each}
			</ul>
		</section>
	{:else}
		{#if data.active.length === 0}
			<p class="muted empty">No games logged yet. Start one!</p>
		{/if}
	{/each}
</main>

<style>
	.new {
		margin: 16px 0 8px;
	}
	section {
		margin-top: 24px;
	}
	h2 {
		margin: 0 0 10px;
		color: var(--muted);
		font-size: 0.95rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	ul {
		display: grid;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.empty {
		margin-top: 24px;
	}
</style>
