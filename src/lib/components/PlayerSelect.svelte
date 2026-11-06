<script lang="ts">
	import { flushSync } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import Avatar from '#lib/components/Avatar.svelte';
	import { NAME_MAX_LENGTH, type PlayerSummary } from '#lib/players.js';

	type Props = { players: PlayerSummary[]; selected: string[]; canAdd?: boolean };

	let { players, selected = $bindable(), canAdd = false }: Props = $props();

	let open = $state(false);
	let name = $state('');
	let saving = $state(false);
	let addError = $state('');
	let nameInput = $state<HTMLInputElement>();

	function openForm() {
		open = true;
		// iOS only opens the keyboard if focus happens synchronously inside the tap.
		flushSync();
		nameInput?.focus();
	}

	function closeForm() {
		open = false;
		name = '';
		addError = '';
	}

	async function add() {
		if (saving || !name.trim()) return;
		saving = true;
		addError = '';
		try {
			const res = await fetch('/api/players', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name })
			});
			const body = await res.json();
			if (res.ok) {
				// Refresh first, so the new player's checkbox exists when they get ticked.
				await invalidateAll();
				selected = [...selected, body.player.id];
				closeForm();
			} else {
				addError = body.error ?? "Couldn't add them. Please try again.";
			}
		} catch {
			addError = "Couldn't add them. Check your connection and try again.";
		}
		saving = false;
	}

	function onNameKey(event: KeyboardEvent) {
		// This sits inside the session's form, where Enter would submit the whole session.
		if (event.key === 'Enter') {
			event.preventDefault();
			add();
		} else if (event.key === 'Escape') {
			closeForm();
		}
	}
</script>

<ul class="players">
	{#each players as player (player.id)}
		<li>
			<label class:on={selected.includes(player.id)}>
				<input type="checkbox" name="playerId" value={player.id} bind:group={selected} />
				<Avatar name={player.name} color={player.color} src={player.avatarUrl} size={52} />
				<span>{player.name}</span>
			</label>
		</li>
	{/each}
	{#if canAdd}
		{#if open}
			<li class="wide">
				<div class="add">
					<!-- No name attribute: this must not be sent along with the session's form. -->
					<input
						class="name"
						type="text"
						bind:this={nameInput}
						bind:value={name}
						onkeydown={onNameKey}
						maxlength={NAME_MAX_LENGTH}
						placeholder="Name of new player"
						aria-label="Name of new player"
						autocomplete="off"
						enterkeyhint="done"
					/>
					<button type="button" class="button add-button" disabled={saving || !name.trim()} onclick={add}>
						Add
					</button>
					<button type="button" class="close" aria-label="Cancel" onclick={closeForm}>✕</button>
				</div>
				{#if addError}
					<p class="error" role="alert">{addError}</p>
				{:else}
					<p class="muted hint">They can link their phone later, when they join.</p>
				{/if}
			</li>
		{:else}
			<li>
				<button type="button" class="tile" onclick={openForm}>
					<span class="plus" aria-hidden="true">+</span>
					<span>Add player</span>
				</button>
			</li>
		{/if}
	{/if}
</ul>

<style>
	.players {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	label {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 12px 4px;
		border: 2px solid transparent;
		border-radius: 14px;
		background: var(--surface);
		cursor: pointer;
		opacity: 0.55;
		transition: opacity 120ms;
	}
	label.on {
		border-color: var(--accent);
		opacity: 1;
	}
	label.on::after {
		content: '✓';
		position: absolute;
		top: 6px;
		right: 8px;
		color: var(--accent);
		font-weight: 800;
	}
	label:has(input:focus-visible) {
		outline: 2px solid var(--text);
	}
	label input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	span {
		max-width: 100%;
		overflow: hidden;
		font-size: 0.9rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tile {
		display: grid;
		justify-items: center;
		gap: 6px;
		width: 100%;
		height: 100%;
		padding: 12px 4px;
		border: 2px dashed var(--surface-2);
		border-radius: 14px;
		background: none;
		color: var(--muted);
		font: inherit;
		cursor: pointer;
	}
	.plus {
		display: grid;
		place-items: center;
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: var(--surface-2);
		color: var(--text);
		font-size: 1.6rem;
		line-height: 1;
	}
	.wide {
		grid-column: 1 / -1;
	}
	.add {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.name {
		flex: 1;
		min-width: 0;
		min-height: 48px;
		padding: 10px 14px;
		border: 2px solid var(--surface-2);
		border-radius: 12px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 1rem; /* 16px+ stops iOS from zooming into the field */
	}
	.name:focus {
		outline: none;
		border-color: var(--accent);
	}
	.add-button {
		width: auto;
		padding-inline: 20px;
	}
	.close {
		flex: none;
		width: 44px;
		height: 48px;
		border: none;
		border-radius: 12px;
		background: none;
		color: var(--muted);
		font: inherit;
		cursor: pointer;
	}
	.hint,
	.error {
		margin: 8px 0 0;
		font-size: 0.9rem;
	}
</style>
