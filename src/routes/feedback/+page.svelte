<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let kind = $state<'bug' | 'idea'>('idea');
	let title = $state('');
	let description = $state('');
	let busy = $state(false);
</script>

<svelte:head>
	<title>Suggestion box · Boardgamer 2000</title>
</svelte:head>

<main class="page">
	<a class="back" href="/" aria-label="Back to start">←</a>
	<h1>Suggestion box</h1>

	{#if form?.sent}
		<p class="intro">Thanks! It's now issue #{form.sent}. We'll have a look.</p>
		<div class="actions">
			<a class="button" href="/">Back to start</a>
			<a class="button secondary" href="/feedback" data-sveltekit-reload>Send another</a>
		</div>
	{:else if !data.enabled}
		<p class="muted intro">The suggestion box is closed for now.</p>
	{:else}
		<p class="muted intro">
			Found a bug or have an idea? It goes straight to the to-do list, with your name on it.
		</p>

		<form
			method="post"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update({ reset: false });
					busy = false;
				};
			}}
		>
			<div class="mode" role="radiogroup" aria-label="What is it?">
				<label class:on={kind === 'bug'}>
					<input type="radio" name="kind" value="bug" bind:group={kind} />
					🐞 A bug
				</label>
				<label class:on={kind === 'idea'}>
					<input type="radio" name="kind" value="idea" bind:group={kind} />
					💡 An idea
				</label>
			</div>

			<label class="field">
				<span>Title</span>
				<input
					type="text"
					name="title"
					bind:value={title}
					required
					minlength="3"
					maxlength="120"
					placeholder={kind === 'bug' ? 'The timer stops at…' : 'It would be fun if…'}
				/>
			</label>

			<label class="field">
				<span>Tell us more</span>
				<textarea
					name="description"
					bind:value={description}
					required
					maxlength="5000"
					rows="6"
					placeholder={kind === 'bug'
						? 'What did you do, what happened, and what did you expect?'
						: 'Describe your idea.'}
				></textarea>
			</label>

			{#if form?.error}<p class="error">{form.error}</p>{/if}

			<button class="button" disabled={busy || title.trim().length < 3 || !description.trim()}>
				{busy ? 'Sending…' : 'Send'}
			</button>
			<p class="muted note">Heads up: suggestions are public on GitHub.</p>
		</form>
	{/if}
</main>

<style>
	.intro {
		margin: 0 0 20px;
	}
	.actions {
		display: grid;
		gap: 8px;
	}
	.mode {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
		margin-bottom: 16px;
		padding: 4px;
		border-radius: 14px;
		background: var(--surface);
	}
	.mode label {
		display: grid;
		place-items: center;
		min-height: 44px;
		padding: 6px;
		border-radius: 10px;
		color: var(--muted);
		font-size: 0.95rem;
		font-weight: 600;
		text-align: center;
		cursor: pointer;
	}
	.mode label.on {
		background: var(--surface-2);
		color: var(--text);
	}
	.mode input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.mode label:has(input:focus-visible) {
		outline: 2px solid var(--accent);
	}
	textarea {
		width: 100%;
		padding: 14px;
		border: 2px solid var(--surface-2);
		border-radius: 12px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 1.1rem; /* 16px+ stops iOS from zooming into the field */
		resize: vertical;
	}
	textarea:focus {
		outline: none;
		border-color: var(--accent);
	}
	.note {
		margin: 10px 0 0;
		font-size: 0.85rem;
		text-align: center;
	}
</style>
