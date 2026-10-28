<script lang="ts">
	import { enhance } from '$app/forms';
	import GameImage from '#lib/components/GameImage.svelte';
	import { TITLE_MAX_LENGTH, type GameSummary } from '#lib/games.js';
	import { resizeToFitJpeg } from '#lib/image.js';

	type Props = {
		/** The game being edited; omit when adding a new one. */
		game?: GameSummary | null;
		action: string;
		error?: string | null;
		submitLabel: string;
	};

	let { game = null, action, error = null, submitLabel }: Props = $props();

	// svelte-ignore state_referenced_locally -- the form starts from the saved game
	let title = $state(game?.title ?? '');
	// svelte-ignore state_referenced_locally
	let bggUrl = $state(game?.bggUrl ?? '');
	/** A resized picture waiting to be saved. */
	let picture = $state<{ blob: Blob; url: string } | null>(null);
	let removePicture = $state(false);
	let pictureError = $state<string | null>(null);
	let busy = $state(false);
	let fileInput: HTMLInputElement;

	const shownPicture = $derived(picture?.url ?? (removePicture ? null : game?.imageUrl));

	async function pickPicture(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		pictureError = null;
		try {
			const blob = await resizeToFitJpeg(file);
			if (picture) URL.revokeObjectURL(picture.url);
			picture = { blob, url: URL.createObjectURL(blob) };
			removePicture = false;
		} catch {
			pictureError = "Couldn't read that image. Try another one.";
		}
		fileInput.value = '';
	}
</script>

<form
	method="post"
	{action}
	enctype="multipart/form-data"
	use:enhance={({ formData }) => {
		busy = true;
		if (picture) formData.set('image', picture.blob, 'game.jpg');
		if (removePicture) formData.set('removeImage', '1');
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success' || result.type === 'redirect') {
				if (picture) URL.revokeObjectURL(picture.url);
				picture = null;
				removePicture = false;
			}
			busy = false;
		};
	}}
>
	<div class="picture">
		<button type="button" class="picture-button" onclick={() => fileInput.click()} aria-label="Choose picture">
			<GameImage title={title || '?'} src={shownPicture} size={140} />
			<span class="edit" aria-hidden="true">📷</span>
		</button>
		<input bind:this={fileInput} type="file" accept="image/*" onchange={pickPicture} hidden />
		{#if shownPicture}
			<button
				type="button"
				class="link"
				onclick={() => {
					picture = null;
					removePicture = true;
				}}>Remove picture</button
			>
		{:else}
			<span class="muted small">Picture is optional</span>
		{/if}
		{#if pictureError}
			<p class="error">{pictureError}</p>
		{/if}
	</div>

	<label class="field">
		<span>Title</span>
		<input type="text" name="title" bind:value={title} maxlength={TITLE_MAX_LENGTH} required />
	</label>
	<label class="field">
		<span>BoardGameGeek link <span class="muted">(optional)</span></span>
		<input
			type="text"
			name="bggUrl"
			bind:value={bggUrl}
			inputmode="url"
			autocapitalize="none"
			spellcheck="false"
			placeholder="boardgamegeek.com/boardgame/…"
		/>
	</label>

	{#if error}
		<p class="error">{error}</p>
	{/if}
	<button class="button" disabled={busy || !title.trim()}>{submitLabel}</button>
</form>

<style>
	.picture {
		display: grid;
		justify-items: center;
		gap: 8px;
		margin-bottom: 24px;
	}
	.picture-button {
		position: relative;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
	}
	.edit {
		position: absolute;
		right: -8px;
		bottom: -8px;
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--surface-2);
		font-size: 1.2rem;
	}
	.small {
		font-size: 0.9rem;
	}
	.field .muted {
		font-weight: 400;
	}
</style>
