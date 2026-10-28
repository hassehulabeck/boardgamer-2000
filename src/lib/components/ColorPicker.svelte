<script lang="ts">
	import { PLAYER_COLORS } from '#lib/colors.js';

	type Props = { name: string; value: string };

	let { name, value = $bindable() }: Props = $props();
</script>

<div class="swatches" role="radiogroup" aria-label="Color">
	{#each PLAYER_COLORS as color (color)}
		<label class="swatch" style:--color={color}>
			<input type="radio" {name} value={color} bind:group={value} />
			<span class="sr-only">{color}</span>
		</label>
	{/each}
</div>

<style>
	.swatches {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 12px;
	}
	.swatch {
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color);
		cursor: pointer;
		transition: transform 120ms;
	}
	.swatch:has(input:checked) {
		box-shadow:
			0 0 0 4px var(--bg),
			0 0 0 7px var(--color);
		transform: scale(0.9);
	}
	.swatch:has(input:focus-visible) {
		outline: 2px solid var(--text);
		outline-offset: 8px;
	}
	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
</style>
