<script lang="ts">
	import type { Snippet } from 'svelte';
	import Bar from './Bar.svelte';

	type Props = {
		href: string;
		title: string;
		value: string | number;
		/** Bar length; leave out for rows without a bar. */
		bar?: { value: number; max: number };
		note?: string;
		/** Picture or avatar at the start of the row. */
		image: Snippet;
	};

	let { href, title, value, bar, note, image }: Props = $props();
</script>

<a {href}>
	{@render image()}
	<span class="body">
		<span class="top">
			<strong>{title}</strong>
			<span class="value">{value}</span>
		</span>
		{#if bar}
			<Bar value={bar.value} max={bar.max} />
		{/if}
		{#if note}
			<small class="muted">{note}</small>
		{/if}
	</span>
</a>

<style>
	a {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 56px;
		padding: 8px 10px;
		border-radius: 12px;
		background: var(--surface);
		color: inherit;
		text-decoration: none;
	}
	.body {
		display: grid;
		flex: 1;
		gap: 4px;
		min-width: 0;
	}
	.top {
		display: flex;
		justify-content: space-between;
		gap: 8px;
	}
	strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.value {
		flex: none;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	small {
		font-size: 0.8rem;
	}
</style>
