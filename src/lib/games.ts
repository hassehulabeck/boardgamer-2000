/** What pages get to know about a game. Never includes the image bytes. */
export type GameSummary = {
	id: string;
	title: string;
	/** Versioned image URL, or null when the game has no picture. */
	imageUrl: string | null;
	bggUrl: string | null;
};

export type GameListItem = GameSummary & { plays: number };

export const TITLE_MAX_LENGTH = 60;

export function gameImageUrl(id: string, imageUpdatedAt: Date | null): string | null {
	return imageUpdatedAt ? `/games/${id}/image?v=${imageUpdatedAt.getTime()}` : null;
}
