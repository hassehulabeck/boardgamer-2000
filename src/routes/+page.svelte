<script lang="ts">
	import Avatar from '#lib/components/Avatar.svelte';
	import SessionCard from '#lib/components/SessionCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<main class="page">
	<header>
		<div>
			<h1>Boardgamer 2000</h1>
			<p class="muted">Our game night companion</p>
		</div>
		{#if data.me}
			<a href="/profile" class="me" aria-label="Your profile">
				<Avatar name={data.me.name} color={data.me.color} src={data.me.avatarUrl} size={48} />
			</a>
		{/if}
	</header>

	{#if data.active.length > 0}
		<section class="active">
			<h2>Right now</h2>
			<ul>
				{#each data.active as session (session.id)}
					<li><SessionCard {session} /></li>
				{/each}
			</ul>
		</section>
	{/if}

	<nav>
		<a class="tile primary" href="/sessions/new">
			<span class="emoji" aria-hidden="true">🎲</span>
			<span>
				<strong>New game</strong>
				<small>Pick a game and who's playing</small>
			</span>
		</a>
		<a class="tile" href="/picker">
			<span class="emoji" aria-hidden="true">☝️</span>
			<span>
				<strong>Who starts?</strong>
				<small>Everyone puts a finger on the screen</small>
			</span>
		</a>
		<a class="tile" href="/games">
			<span class="emoji" aria-hidden="true">📦</span>
			<span>
				<strong>Games</strong>
				<small>{data.gameCount === 1 ? '1 game' : `${data.gameCount} games`} in the library</small>
			</span>
		</a>
		<a class="tile" href="/sessions">
			<span class="emoji" aria-hidden="true">📜</span>
			<span>
				<strong>History</strong>
				<small>Every game we've played</small>
			</span>
		</a>
		<a class="tile" href="/stats">
			<span class="emoji" aria-hidden="true">📊</span>
			<span>
				<strong>Stats</strong>
				<small>Who wins, what we play, and when</small>
			</span>
		</a>
	</nav>

	<section class="group">
		<h2>The group <span class="muted">· {data.players.length}</span></h2>
		<ul>
			{#each data.players as player (player.id)}
				<li>
					<a href="/stats/players/{player.id}">
						<Avatar name={player.name} color={player.color} src={player.avatarUrl} size={44} />
						<span>{player.name}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
</main>

<style>
	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 24px;
	}
	header p {
		margin: 0;
	}
	.me {
		border-radius: 50%;
	}
	.active {
		margin-bottom: 24px;
	}
	.active h2 {
		margin: 0 0 10px;
		font-size: 1.1rem;
	}
	.active ul {
		display: grid;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	nav {
		display: grid;
		gap: 12px;
	}
	.tile {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 18px;
		border-radius: 16px;
		background: var(--surface);
		color: inherit;
		text-decoration: none;
	}
	.tile strong {
		display: block;
		font-size: 1.15rem;
	}
	.tile small {
		color: var(--muted);
	}
	.primary {
		outline: 2px solid var(--accent);
	}
	.emoji {
		font-size: 2rem;
	}
	.group {
		margin-top: 32px;
	}
	.group h2 {
		margin: 0 0 12px;
		font-size: 1.1rem;
	}
	.group ul {
		display: flex;
		flex-wrap: wrap;
		gap: 16px 12px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.group li {
		width: 64px;
	}
	.group a {
		display: grid;
		justify-items: center;
		gap: 4px;
		color: inherit;
		font-size: 0.8rem;
		text-align: center;
		text-decoration: none;
	}
	.group a span {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
