import { FileStream, type ID } from 'jazz-tools';
import type { Photo } from '$lib/schema';

export function imageDataToFile(imageData: ImageData, filename = 'image.jpeg'): Promise<File> {
	// Create a temporary canvas to draw the image data
	const canvas = document.createElement('canvas');
	canvas.width = imageData.width;
	canvas.height = imageData.height;
	const ctx = canvas.getContext('2d');

	if (!ctx) throw new Error('No context'); // TODO: throw an error
	ctx.putImageData(imageData, 0, 0);

	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) {
				const file = new File([blob], filename, { type: 'image/jpeg' });
				resolve(file);
			} else {
				reject(new Error('Failed to create blob'));
				// TODO: throw an error
			}
		}, 'image/jpeg');
	});
}

export const getFile = async (id: ID<FileStream>) => {
	if (!id) return;
	try {
		const blob = await FileStream.loadAsBlob(id);
		if (!blob) return;
		// Add a 'finished loading' thing here so I can have a square loading image, and then only render those that are coming onto the screen
		return createImageBitmap(blob);
	} catch (e) {
		console.log({ e });
	}
};

export async function renderCanvas(
	canvas: HTMLCanvasElement,
	photo: Photo,
	naturalDimensions: { w: number; h: number }
) {
	const ctx = canvas.getContext('2d');
	if (!ctx || !photo.file?.id) return;

	const mainImage = await getFile(photo.file.id);
	if (!mainImage) return;

	naturalDimensions.w = mainImage.width;
	naturalDimensions.h = mainImage.height;
	canvas.width = mainImage.width;
	canvas.height = mainImage.height;

	// Clear any previous content and ensure clean rendering
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(mainImage, 0, 0);

	const primaryColour = getComputedStyle(document.documentElement)
		.getPropertyValue('--color-primary')
		.trim();
	ctx.strokeStyle = primaryColour;

	if (photo.faceSlices) {
		// First pass: draw all borders
		for (const slice of photo.faceSlices) {
			if (!slice?.x || !slice?.y || !slice?.width || !slice?.height) continue;
			const lineWidth = Math.floor(Math.max(slice.width / 24, 2));
			ctx.lineWidth = lineWidth;

			// Adjust border position to be fully under the face image
			const x = Math.floor(slice.x);
			const y = Math.floor(slice.y);
			const width = Math.ceil(slice.width);
			const height = Math.ceil(slice.height);
			const radius = Math.floor(slice.width / 24);

			ctx.beginPath();
			ctx.roundRect(
				x + lineWidth / 2,
				y + lineWidth / 2,
				width - lineWidth,
				height - lineWidth,
				radius
			);
			ctx.stroke();
			if (!slice?.file?.id) continue;
			try {
				const faceImage = await getFile(slice.file.id);
				if (faceImage) {
					ctx.drawImage(
						faceImage,
						Math.floor(slice.x),
						Math.floor(slice.y),
						Math.ceil(slice.width),
						Math.ceil(slice.height)
					);
				}
			} catch (e) {
				console.log(e);
				// NOOP: this is expected behaviour if a user has no rights to view a slice
			}
		}
	}
	return;
}
