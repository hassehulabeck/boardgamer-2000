<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import ColorPicker from '#lib/components/ColorPicker.svelte';
	import { NAME_MAX_LENGTH } from '#lib/players.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let name = $state('');
	// svelte-ignore state_referenced_locally -- only the initial suggestion is wanted
	let color = $state(data.suggestedColor);
	let claimId = $state<string | null>(null);
	let busy = $state(false);

	const claimed = $derived(data.players.find((p) => p.id === claimId));

	function submitting() {
		busy = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = false;
		};
	}
</script>

<svelte:head>
	<title>Welcome · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<h1>Welcome!</h1>
	<p class="muted">Who's playing on this phone?</p>

	{#if data.players.length > 0}
		<section>
			<h2>I'm already in the list</h2>
			<p class="muted small">For example if you've used the app on another phone or in Safari.</p>
			<ul class="players">
				{#each data.players as player (player.id)}
					<li>
						<button
							type="button"
							class="player"
							class:selected={player.id === claimId}
							aria-pressed={player.id === claimId}
							onclick={() => (claimId = player.id === claimId ? null : player.id)}
						>
							<Avatar name={player.name} color={player.color} src={player.avatarUrl} size={56} />
							<span>{player.name}</span>
						</button>
					</li>
				{/each}
			</ul>
			{#if form?.claimError}
				<p class="error">{form.claimError}</p>
			{/if}
			{#if claimed}
				<form method="post" action="?/claim" use:enhance={submitting}>
					<input type="hidden" name="playerId" value={claimed.id} />
					<button class="button" disabled={busy}>Yes, I'm {claimed.name}</button>
				</form>
			{/if}
		</section>
	{/if}

	<section>
		<h2>{data.players.length > 0 ? "I'm new here" : 'Create your profile'}</h2>
		<form method="post" action="?/create" use:enhance={submitting}>
			<label class="field">
				<span>Your name</span>
				<input
					type="text"
					name="name"
					bind:value={name}
					maxlength={NAME_MAX_LENGTH}
					autocomplete="given-name"
					required
				/>
			</label>
			<div class="field">
				<span>Your color</span>
				<ColorPicker name="color" bind:value={color} />
			</div>
			{#if form?.createError}
				<p class="error">{form.createError}</p>
			{/if}
			<div class="preview">
				<Avatar name={name || '?'} {color} size={56} />
				<button class="button" disabled={busy || !name.trim()}>Create profile</button>
			</div>
		</form>
	</section>
</main>

<style>
	section {
		margin-top: 32px;
	}
	h2 {
		margin: 0 0 4px;
		font-size: 1.2rem;
	}
	.small {
		margin: 0 0 16px;
		font-size: 0.9rem;
	}
	.players {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
		gap: 12px;
		margin: 0 0 16px;
		padding: 0;
		list-style: none;
	}
	.player {
		display: grid;
		justify-items: center;
		gap: 8px;
		width: 100%;
		padding: 12px 4px;
		border: 2px solid transparent;
		border-radius: 14px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		cursor: pointer;
	}
	.player span {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.player.selected {
		border-color: var(--accent);
	}
	.preview {
		display: flex;
		align-items: center;
		gap: 16px;
	}
</style>
