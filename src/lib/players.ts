/** What pages get to know about a player. Never includes the avatar bytes. */
export type PlayerSummary = {
	id: string;
	name: string;
	color: string;
	/** Versioned avatar URL, or null when the player has no photo. */
	avatarUrl: string | null;
};

export const NAME_MAX_LENGTH = 30;

export function avatarUrl(id: string, avatarUpdatedAt: Date | null): string | null {
	return avatarUpdatedAt ? `/players/${id}/avatar?v=${avatarUpdatedAt.getTime()}` : null;
}

export function initials(name: string): string {
	const parts = name.trim().split(/\s+/);
	const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
	return letters.toUpperCase();
}
