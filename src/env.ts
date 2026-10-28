import { defineEnvVars } from '@sveltejs/kit/env';

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
	}
});
