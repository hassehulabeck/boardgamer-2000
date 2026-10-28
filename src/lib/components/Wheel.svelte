<script lang="ts">
	import { randomIndex } from '#lib/picker.js';
	import type { PlayerSummary } from '#lib/players.js';

	type Props = {
		players: PlayerSummary[];
		onresult: (player: PlayerSummary) => void;
	};

	let { players, onresult }: Props = $props();

	const C = 100;
	const R = 96;

	let rotation = $state(0);
	let spinMs = $state(5000);
	let spinning = $state(false);
	let resultIndex = $state<number | null>(null);

	const seg = $derived(360 / players.length);

	/** Point on the rim, with 0° at the top and angles going clockwise. */
	function rim(deg: number, r = R) {
		const rad = (deg * Math.PI) / 180;
		return `${C + r * Math.sin(rad)},${C - r * Math.cos(rad)}`;
	}

	function slice(i: number) {
		const a0 = i * seg;
		const a1 = (i + 1) * seg;
		return `M${C},${C} L${rim(a0)} A${R},${R} 0 ${seg > 180 ? 1 : 0} 1 ${rim(a1)} Z`;
	}

	function spin() {
		if (spinning) return;
		resultIndex = null;
		const index = randomIndex(players.length);
		// Land somewhere inside the segment, not on its edge.
		const target = index * seg + seg * (0.2 + 0.6 * Math.random());
		// The pointer is at the top, so the wheel must end rotated by -target (mod 360).
		const delta = (((360 - target - (rotation % 360)) % 360) + 360) % 360;
		spinMs = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1000 : 5000;
		rotation += 360 * 6 + delta;
		spinning = true;
		setTimeout(() => {
			spinning = false;
			resultIndex = index;
			navigator.vibrate?.([60, 40, 160]);
			onresult(players[index]);
		}, spinMs);
	}
</script>

<div class="wheel-wrap">
	<div class="pointer" aria-hidden="true"></div>
	<div class="wheel" class:spinning style:transform="rotate({rotation}deg)" style:--spin-ms="{spinMs}ms">
		<svg viewBox="0 0 200 200" role="img" aria-label="Wheel of players">
			{#each players as player, i (player.id)}
				{#if players.length === 1}
					<circle cx={C} cy={C} r={R} fill={player.color} />
				{:else}
					<path
						d={slice(i)}
						fill={player.color}
						stroke="var(--bg)"
						stroke-width="1.5"
						class:dim={resultIndex !== null && resultIndex !== i}
					/>
				{/if}
				{@const mid = i * seg + seg / 2}
				<!-- Names on the left half are flipped so they never read upside down. -->
				<text
					x={mid > 180 ? C - R + 10 : C + R - 10}
					y={C}
					text-anchor={mid > 180 ? 'start' : 'end'}
					dominant-baseline="middle"
					font-size={players.length > 7 ? 9 : 11}
					transform="rotate({mid > 180 ? mid + 90 : mid - 90} {C} {C})"
				>
					{player.name.length > 11 ? player.name.slice(0, 10) + '…' : player.name}
				</text>
			{/each}
		</svg>
	</div>
	<button type="button" class="hub" onclick={spin} disabled={spinning}>
		{spinning ? '…' : resultIndex === null ? 'Spin!' : 'Again'}
	</button>
</div>

<style>
	.wheel-wrap {
		position: relative;
		width: min(100%, 320px);
		margin: 8px auto 0;
		aspect-ratio: 1;
	}
	.pointer {
		position: absolute;
		top: -6px;
		left: 50%;
		z-index: 2;
		width: 0;
		height: 0;
		border-top: 26px solid var(--text);
		border-right: 14px solid transparent;
		border-left: 14px solid transparent;
		transform: translateX(-50%);
		filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.5));
	}
	.wheel {
		width: 100%;
		height: 100%;
	}
	.wheel.spinning {
		transition: transform var(--spin-ms) cubic-bezier(0.12, 0.6, 0.1, 1);
	}
	svg {
		display: block;
		width: 100%;
		height: 100%;
	}
	path {
		transition: opacity 300ms;
	}
	path.dim {
		opacity: 0.25;
	}
	text {
		fill: #100e1c;
		font-weight: 700;
		pointer-events: none;
	}
	.hub {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 30%;
		aspect-ratio: 1;
		border: 4px solid var(--bg);
		border-radius: 50%;
		background: var(--text);
		color: #100e1c;
		font: inherit;
		font-weight: 800;
		font-size: 1.1rem;
		transform: translate(-50%, -50%);
		cursor: pointer;
	}
</style>
