<script lang="ts">
	import { enhance } from '$app/forms';
	import GameImage from '#lib/components/GameImage.svelte';
	import { bggIdFromUrl, TITLE_MAX_LENGTH, type BggThing, type GameSummary } from '#lib/games.js';
	import { resizeToFitJpeg } from '#lib/image.js';

	type Props = {
		/** The game being edited; omit when adding a new one. */
		game?: GameSummary | null;
		action: string;
		error?: string | null;
		submitLabel: string;
		/** Whether BoardGameGeek lookup is set up on the server. */
		bgg?: boolean;
	};

	let { game = null, action, error = null, submitLabel, bgg = false }: Props = $props();

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

	/** BoardGameGeek matches for the title; null when the list isn't open. */
	let matches = $state<BggThing[] | null>(null);
	let bggBusy = $state(false);
	let bggError = $state<string | null>(null);
	const bggId = $derived(bggIdFromUrl(bggUrl));

	/** Our API answers errors as JSON `{ message }`. */
	async function bggFetch(path: string): Promise<Response> {
		const response = await fetch(path);
		if (!response.ok) {
			const body = await response.json().catch(() => null);
			throw new Error(body?.message ?? "Couldn't reach BoardGameGeek");
		}
		return response;
	}

	async function findOnBgg() {
		bggBusy = true;
		bggError = null;
		try {
			matches = await (await bggFetch(`/api/bgg/search?q=${encodeURIComponent(title)}`)).json();
		} catch (err) {
			bggError = (err as Error).message;
		} finally {
			bggBusy = false;
		}
	}

	async function chooseMatch(match: BggThing) {
		matches = null;
		bggUrl = `https://boardgamegeek.com/boardgame/${match.id}`;
		await pictureFromBgg(match.id);
	}

	async function pictureFromBgg(id: number) {
		bggBusy = true;
		bggError = null;
		try {
			const blob = await (await bggFetch(`/api/bgg/${id}/image`)).blob();
			const resized = await resizeToFitJpeg(blob);
			if (picture) URL.revokeObjectURL(picture.url);
			picture = { blob: resized, url: URL.createObjectURL(resized) };
			removePicture = false;
		} catch (err) {
			bggError = (err as Error).message;
		} finally {
			bggBusy = false;
		}
	}

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
	{#if bgg}
		<div class="bgg">
			{#if matches}
				{#if matches.length === 0}
					<p class="muted">No board games called “{title}” on BoardGameGeek.</p>
				{:else}
					<p class="muted">Which one is it?</p>
					<ul>
						{#each matches as match (match.id)}
							<li>
								<button type="button" onclick={() => chooseMatch(match)}>
									<GameImage title={match.name} src={match.thumbnail} size={44} />
									<span>
										<strong>{match.name}</strong>
										<small class="muted">
											{[match.year, match.ratings && `${match.ratings.toLocaleString('en-GB')} ratings`]
												.filter(Boolean)
												.join(' · ')}
										</small>
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				<button type="button" class="link" onclick={() => (matches = null)}>Never mind</button>
			{:else if title.trim().length >= 2}
				<button type="button" class="button secondary" onclick={findOnBgg} disabled={bggBusy}>
					{bggBusy ? 'Looking…' : 'Find on BoardGameGeek'}
				</button>
			{/if}
			{#if bggError}
				<p class="error">{bggError}</p>
			{/if}
		</div>
	{/if}
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
	{#if bgg && bggId && !shownPicture && !matches}
		<button type="button" class="link get-picture" onclick={() => pictureFromBgg(bggId)} disabled={bggBusy}>
			{bggBusy ? 'Getting picture…' : 'Get the picture from BoardGameGeek'}
		</button>
	{/if}

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
	.bgg {
		margin: -4px 0 20px;
	}
	.bgg p {
		margin: 0 0 8px;
	}
	.bgg ul {
		display: grid;
		gap: 4px;
		margin: 0 0 4px;
		padding: 0;
		list-style: none;
	}
	.bgg li button {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 56px;
		padding: 6px 10px;
		border: none;
		border-radius: 12px;
		background: var(--surface);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.bgg li span {
		display: grid;
		min-width: 0;
	}
	.bgg strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.bgg .link {
		min-height: 44px;
	}
	.get-picture {
		min-height: 44px;
		margin: -8px 0 12px;
		padding: 0;
	}
	.field .muted {
		font-weight: 400;
	}
</style>
