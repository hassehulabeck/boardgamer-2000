/** What pages get to know about a game. Never includes the image bytes. */
export type GameSummary = {
	id: string;
	title: string;
	/** Versioned image URL, or null when the game has no picture. */
	imageUrl: string | null;
	bggUrl: string | null;
};

export type GameListItem = GameSummary & { plays: number };

/** A game on BoardGameGeek, as offered when looking one up. */
export type BggSearchHit = { id: number; name: string; year: number | null };
export type BggThing = BggSearchHit & {
	image: string | null;
	thumbnail: string | null;
	/** How many people rated it; a good stand-in for "the one you mean". */
	ratings: number;
};

export const TITLE_MAX_LENGTH = 60;

export function gameImageUrl(id: string, imageUpdatedAt: Date | null): string | null {
	return imageUpdatedAt ? `/games/${id}/image?v=${imageUpdatedAt.getTime()}` : null;
}

/** The BGG id in a link like boardgamegeek.com/boardgame/13/catan. */
export function bggIdFromUrl(url: string): number | null {
	const match = /boardgamegeek\.com\/boardgame(?:expansion)?\/(\d+)/i.exec(url);
	return match ? Number(match[1]) : null;
}
