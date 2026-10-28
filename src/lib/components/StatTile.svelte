<script lang="ts">
	type Props = { label: string; value: string | number; note?: string };

	let { label, value, note }: Props = $props();
</script>

<div class="tile">
	<strong class:long={String(value).length > 6}>{value}</strong>
	<span>{label}</span>
	{#if note}
		<small>{note}</small>
	{/if}
</div>

<style>
	.tile {
		display: grid;
		align-content: start;
		gap: 2px;
		padding: 14px 12px;
		border-radius: 14px;
		background: var(--surface);
		min-width: 0;
	}
	strong {
		font-size: 1.6rem;
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}
	/* Words like "Yesterday" don't fit a third of a phone screen at full size. */
	.long {
		font-size: 1.15rem;
		line-height: 1.4;
	}
	span {
		color: var(--muted);
		font-size: 0.85rem;
	}
	small {
		color: var(--muted);
		font-size: 0.75rem;
	}
</style>
