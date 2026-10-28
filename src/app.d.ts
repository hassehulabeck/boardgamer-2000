// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { PlayerSummary } from '#lib/players.js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Set once this browser has entered the group code. */
			deviceId: string | null;
			/** Set once this device is linked to a profile. */
			player: PlayerSummary | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
