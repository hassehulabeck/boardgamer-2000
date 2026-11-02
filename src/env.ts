import { defineEnvVars } from '@sveltejs/kit/env';

/** Optional settings: missing or blank turns the feature off. */
function optional(value: string | undefined) {
	return value?.trim() || undefined;
}

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Postgres connection string'
	},
	GROUP_CODE: {
		description: 'Shared code that lets a phone join the group',
		schema: (value) => {
			if (!value?.trim()) throw new Error('GROUP_CODE must be set');
			return value.trim();
		}
	},
	VAPID_PUBLIC_KEY: {
		description: 'Web Push public key; push is off when the keys are missing',
		schema: optional
	},
	VAPID_PRIVATE_KEY: {
		description: 'Web Push private key',
		schema: optional
	},
	BGG_TOKEN: {
		description: 'BoardGameGeek XML API token; picture lookup is off without it',
		schema: optional
	},
	GITHUB_TOKEN: {
		description: 'Fine-grained GitHub token with Issues read/write; the suggestion box is off without it',
		schema: optional
	},
	GITHUB_REPO: {
		description: 'Repo that suggestions become issues in, as owner/name',
		schema: (value) => optional(value) ?? 'hassehulabeck/boardgamer-2000'
	}
});
