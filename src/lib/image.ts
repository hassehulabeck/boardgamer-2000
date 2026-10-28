// Photos are shrunk on the phone before upload so they stay small (~20–50 KB). JPEG because
// not every iPhone can encode WebP from a canvas.

/** Center-crops a photo to a square of `size` px (avatars). */
export async function resizeToSquareJpeg(file: Blob, size = 256, quality = 0.85): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const side = Math.min(bitmap.width, bitmap.height);
	const { canvas, ctx } = makeCanvas(size, size);
	ctx.drawImage(
		bitmap,
		(bitmap.width - side) / 2,
		(bitmap.height - side) / 2,
		side,
		side,
		0,
		0,
		size,
		size
	);
	bitmap.close();
	return encodeJpeg(canvas, quality);
}

/** Shrinks a photo to fit within `max` px on its longest side, keeping its shape (box art). */
export async function resizeToFitJpeg(file: Blob, max = 512, quality = 0.85): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
	const { canvas, ctx } = makeCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
	ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	return encodeJpeg(canvas, quality);
}

function makeCanvas(width: number, height: number) {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas is not available');
	ctx.imageSmoothingQuality = 'high';
	return { canvas, ctx };
}

function encodeJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
			'image/jpeg',
			quality
		)
	);
}
