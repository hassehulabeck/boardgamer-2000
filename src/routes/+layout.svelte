<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>Boardgamer 2000</title>
</svelte:head>

{@render children()}

<style>
	:global(:root) {
		--bg: #100e1c;
		--surface: #1b1830;
		--surface-2: #272342;
		--text: #f4f2ff;
		--muted: #a29dc4;
		--accent: #ffd166;
		--danger: #ff5d73;
		color-scheme: dark;
	}
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}
	:global(html, body) {
		margin: 0;
		height: 100%;
		background: var(--bg);
		color: var(--text);
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		overscroll-behavior: none;
	}

	/* Shared page shell and form controls */
	:global(.page) {
		max-width: 480px;
		margin: 0 auto;
		padding: calc(env(safe-area-inset-top) + 24px) 16px calc(env(safe-area-inset-bottom) + 32px);
	}
	:global(.page h1) {
		margin: 0 0 4px;
		font-size: 1.8rem;
	}
	:global(.muted) {
		color: var(--muted);
	}
	:global(.field) {
		display: grid;
		gap: 6px;
		margin-bottom: 16px;
	}
	:global(.field > span) {
		font-weight: 600;
	}
	:global(input[type='text']) {
		width: 100%;
		padding: 14px;
		border: 2px solid var(--surface-2);
		border-radius: 12px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 1.1rem; /* 16px+ stops iOS from zooming into the field */
	}
	:global(input[type='text']:focus) {
		outline: none;
		border-color: var(--accent);
	}
	:global(.button) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 14px 18px;
		border: none;
		border-radius: 12px;
		background: var(--accent);
		color: #100e1c;
		font: inherit;
		font-weight: 700;
		font-size: 1.05rem;
		text-decoration: none;
		cursor: pointer;
	}
	:global(.button.secondary) {
		background: var(--surface-2);
		color: var(--text);
	}
	:global(.button.danger) {
		background: transparent;
		color: var(--danger);
		box-shadow: inset 0 0 0 2px var(--danger);
	}
	:global(.button:disabled) {
		opacity: 0.5;
	}
	:global(.back) {
		display: inline-grid;
		place-items: center;
		width: 44px;
		height: 44px;
		margin-bottom: 12px;
		border-radius: 50%;
		background: var(--surface);
		color: var(--text);
		font-size: 1.4rem;
		text-decoration: none;
	}
	:global(.link) {
		border: none;
		background: none;
		color: var(--muted);
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
	:global(.error) {
		margin: 0 0 16px;
		color: var(--danger);
		font-weight: 600;
	}
</style>
