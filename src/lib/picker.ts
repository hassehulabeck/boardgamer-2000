/** Uniform random integer in [0, n) from the crypto RNG, without modulo bias. */
export function randomIndex(n: number): number {
	if (n <= 0) throw new Error('randomIndex needs n > 0');
	const limit = Math.floor(0x100000000 / n) * n;
	const buf = new Uint32Array(1);
	do {
		crypto.getRandomValues(buf);
	} while (buf[0] >= limit);
	return buf[0] % n;
}
