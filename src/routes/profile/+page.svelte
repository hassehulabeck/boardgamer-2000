<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import ColorPicker from '#lib/components/ColorPicker.svelte';
	import PushToggle from '#lib/components/PushToggle.svelte';
	import { resizeToSquareJpeg } from '#lib/image.js';
	import { NAME_MAX_LENGTH } from '#lib/players.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// svelte-ignore state_referenced_locally -- the form starts from the saved profile
	const me = data.me!;
	let name = $state(me.name);
	let color = $state(me.color);
	/** A resized photo waiting to be saved. */
	let photo = $state<{ blob: Blob; url: string } | null>(null);
	let removePhoto = $state(false);
	let photoError = $state<string | null>(null);
	let busy = $state(false);
	let fileInput: HTMLInputElement;

	const shownPhoto = $derived(photo?.url ?? (removePhoto ? null : data.me?.avatarUrl));

	async function pickPhoto(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		photoError = null;
		try {
			const blob = await resizeToSquareJpeg(file);
			if (photo) URL.revokeObjectURL(photo.url);
			photo = { blob, url: URL.createObjectURL(blob) };
			removePhoto = false;
		} catch {
			photoError = "Couldn't read that image. Try another one.";
		}
		fileInput.value = '';
	}
</script>

<svelte:head>
	<title>Profile · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<a class="back" href="/" aria-label="Back to start">←</a>
	<h1>{data.isNew ? `Hi ${me.name}!` : 'Your profile'}</h1>
	{#if data.isNew}
		<p class="muted">Add a photo so everyone can spot you. You can change this any time.</p>
	{/if}

	<form
		method="post"
		action="?/save"
		enctype="multipart/form-data"
		use:enhance={({ formData }) => {
			busy = true;
			if (photo) formData.set('avatar', photo.blob, 'avatar.jpg');
			if (removePhoto) formData.set('removeAvatar', '1');
			return async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') {
					if (photo) URL.revokeObjectURL(photo.url);
					photo = null;
					removePhoto = false;
				}
				busy = false;
			};
		}}
	>
		<div class="photo">
			<button type="button" class="photo-button" onclick={() => fileInput.click()} aria-label="Choose photo">
				<Avatar name={name || '?'} {color} src={shownPhoto} size={120} />
				<span class="edit" aria-hidden="true">📷</span>
			</button>
			<input bind:this={fileInput} type="file" accept="image/*" onchange={pickPhoto} hidden />
			{#if shownPhoto}
				<button
					type="button"
					class="link"
					onclick={() => {
						photo = null;
						removePhoto = true;
					}}>Remove photo</button
				>
			{/if}
			{#if photoError}
				<p class="error">{photoError}</p>
			{/if}
		</div>

		<label class="field">
			<span>Name</span>
			<input type="text" name="name" bind:value={name} maxlength={NAME_MAX_LENGTH} required />
		</label>
		<div class="field">
			<span>Color</span>
			<ColorPicker name="color" bind:value={color} />
		</div>

		{#if form?.error}
			<p class="error">{form.error}</p>
		{:else if form?.saved}
			<p class="saved">Saved ✓</p>
		{/if}
		<button class="button" disabled={busy || !name.trim()}>Save</button>
	</form>

	{#if data.pushKey}
		<section class="phone">
			<h2>Notifications</h2>
			<PushToggle publicKey={data.pushKey} />
		</section>
	{/if}

	<section class="phone">
		<h2>This phone</h2>
		<p class="muted">
			{data.phones === 1
				? 'Your profile is used on 1 phone or browser.'
				: `Your profile is used on ${data.phones} phones or browsers.`}
			If someone else uses this phone, you can disconnect it from your profile.
		</p>
		<form
			method="post"
			action="?/forget"
			use:enhance={({ cancel }) => {
				if (!confirm(`Disconnect this phone from ${me.name}? Your profile and games are kept.`)) cancel();
			}}
		>
			<button class="button danger">Disconnect this phone</button>
		</form>
	</section>
</main>

<style>
	form {
		margin-top: 24px;
	}
	.photo {
		display: grid;
		justify-items: center;
		gap: 8px;
		margin-bottom: 24px;
	}
	.photo-button {
		position: relative;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: none;
		cursor: pointer;
	}
	.edit {
		position: absolute;
		right: -4px;
		bottom: -4px;
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--surface-2);
		font-size: 1.2rem;
	}
	.saved {
		margin: 0 0 16px;
		color: #06d6a0;
		font-weight: 600;
	}
	.phone {
		margin-top: 48px;
	}
	.phone h2 {
		margin: 0 0 8px;
		font-size: 1.2rem;
	}
	.phone form {
		margin-top: 16px;
	}
</style>
