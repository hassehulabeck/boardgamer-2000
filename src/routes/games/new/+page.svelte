<script lang="ts">
	import GameForm from '#lib/components/GameForm.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>Add game · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<a class="back" href="/games" aria-label="Back to games">←</a>
	<h1>Add game</h1>
	<GameForm action="" error={form?.error} submitLabel="Add game" />
</main>
