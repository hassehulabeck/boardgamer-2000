<script lang="ts">
	import { initials } from '#lib/players.js';

	type Props = {
		name: string;
		color: string;
		/** Photo URL; falls back to initials on the player's color. */
		src?: string | null;
		size?: number;
	};

	let { name, color, src = null, size = 48 }: Props = $props();
</script>

<span class="avatar" style:--color={color} style:--size="{size}px" title={name}>
	{#if src}
		<img {src} alt="" width={size} height={size} />
	{:else}
		<span class="initials" aria-hidden="true">{initials(name)}</span>
	{/if}
</span>

<style>
	.avatar {
		display: inline-grid;
		place-items: center;
		flex: none;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		background: var(--color);
		box-shadow: 0 0 0 2px var(--color);
		overflow: hidden;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.initials {
		color: #100e1c;
		font-weight: 700;
		font-size: calc(var(--size) * 0.38);
	}
</style>
