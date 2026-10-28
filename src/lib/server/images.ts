/** Uploads are resized on the phone, so anything bigger than this is not from our app. */
export const MAX_IMAGE_BYTES = 300 * 1024;

/** Reads an uploaded image, or returns an error message. Null means no file was sent. */
export async function readImage(
	value: FormDataEntryValue | null
): Promise<{ data: Buffer } | { error: string } | null> {
	if (!(value instanceof File) || value.size === 0) return null;
	if (value.size > MAX_IMAGE_BYTES) return { error: 'That image is too large' };
	const data = Buffer.from(await value.arrayBuffer());
	if (!imageType(data)) return { error: 'Please use a JPEG, PNG or WebP image' };
	return { data };
}

/** Detects the image format from its first bytes. */
export function imageType(data: Buffer): string | null {
	if (data[0] === 0xff && data[1] === 0xd8) return 'image/jpeg';
	if (data[0] === 0x89 && data.subarray(1, 4).toString('ascii') === 'PNG') return 'image/png';
	if (data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP') {
		return 'image/webp';
	}
	return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
	return UUID.test(value);
}

/** Image URLs carry a version (?v=…), so a changed image gets a new URL and can cache forever. */
export function imageResponse(data: Buffer): Response {
	return new Response(new Uint8Array(data), {
		headers: {
			'content-type': imageType(data) ?? 'application/octet-stream',
			'cache-control': 'private, max-age=31536000, immutable'
		}
	});
}
