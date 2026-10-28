/** Bright, easy-to-tell-apart colors. Used for player profiles and picker fingers. */
export const PLAYER_COLORS = [
	'#ff5d73',
	'#4cc9f0',
	'#ffd166',
	'#06d6a0',
	'#b388ff',
	'#ff9f1c',
	'#f15bb5',
	'#90e0ef',
	'#c5f277',
	'#ffffff'
];

/** Returns the first palette color not already taken. */
export function nextColor(used: string[]): string {
	return (
		PLAYER_COLORS.find((c) => !used.includes(c)) ?? PLAYER_COLORS[used.length % PLAYER_COLORS.length]
	);
}
