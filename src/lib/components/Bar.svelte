<script lang="ts">
	type Props = { value: number; max: number };

	let { value, max }: Props = $props();
</script>

<!-- Decorative: the number is always written next to it. -->
<span class="track" aria-hidden="true">
	{#if value > 0}
		<span class="fill" style:width="{(value / max) * 100}%"></span>
	{/if}
</span>

<style>
	.track {
		display: block;
		height: 6px;
		border-radius: 3px;
		background: var(--surface-2);
		overflow: hidden;
	}
	.fill {
		display: block;
		height: 100%;
		min-width: 4px;
		border-radius: 3px;
		background: var(--accent);
	}
</style>
