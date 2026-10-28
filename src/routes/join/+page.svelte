<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let busy = $state(false);
</script>

<svelte:head>
	<title>Join · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<img class="logo" src="/icon.svg" alt="" width="88" height="88" />
	<h1>Boardgamer 2000</h1>
	<p class="muted">Enter the group code to join. You only need to do this once on each phone.</p>

	<form
		method="post"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update();
				busy = false;
			};
		}}
	>
		<label class="field">
			<span>Group code</span>
			<input
				type="text"
				name="code"
				autocomplete="off"
				autocapitalize="none"
				spellcheck="false"
				required
			/>
		</label>
		{#if form?.wrong}
			<p class="error">That's not the right code. Ask someone in the group.</p>
		{/if}
		<button class="button" disabled={busy}>Join</button>
	</form>
</main>

<style>
	.logo {
		display: block;
		margin: 24px 0 20px;
	}
	form {
		margin-top: 28px;
	}
</style>
