<script lang="ts">
	import { PLAYER_COLORS } from '#lib/colors.js';

	type Props = {
		title: string;
		/** Picture URL; falls back to the first letter on a color picked from the title. */
		src?: string | null;
		size?: number;
	};

	let { title, src = null, size = 64 }: Props = $props();

	const color = $derived(
		PLAYER_COLORS[[...title].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % PLAYER_COLORS.length]
	);
</script>

<span class="game-image" style:--size="{size}px" style:--color={color}>
	{#if src}
		<img {src} alt="" width={size} height={size} />
	{:else}
		<span class="letter" aria-hidden="true">{title.trim().charAt(0).toUpperCase() || '?'}</span>
	{/if}
</span>

<style>
	.game-image {
		display: inline-grid;
		place-items: center;
		flex: none;
		width: var(--size);
		height: var(--size);
		border-radius: calc(var(--size) * 0.16);
		background: var(--surface-2);
		overflow: hidden;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.letter {
		color: var(--color);
		font-weight: 800;
		font-size: calc(var(--size) * 0.45);
	}
</style>
