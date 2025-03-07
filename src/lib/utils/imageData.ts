import { Account, FileStream, type ID } from 'jazz-tools';
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
	if (!id) throw new Error('No ID provided');
	try {
		const blob = await FileStream.loadAsBlob(id);
		if (!blob) throw new Error('No blob');
		return createImageBitmap(blob);
	} catch (e) {
		console.log({ e });
		throw new Error('Error loading blob');
	}
};

export async function renderCanvas(
	canvas: HTMLCanvasElement,
	photo: Photo,
	naturalDimensions: { w: number; h: number }
) {
	const ctx = canvas.getContext('2d');
	if (!ctx || !photo.file?.id) throw new Error('No context or no photo file.');

	const mainImage = await getFile(photo.file.id);
	if (!mainImage) throw new Error('No main image');

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
		// Create an array of promises for each slice
		const slicePromises = photo.faceSlices.map(async (slice) => {
			if (!slice?.x || !slice?.y || !slice?.width || !slice?.height) return;

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

			if (!slice?.file?.id) return;

			// Handle face image loading with timeout to prevent hanging
			try {
				const me = Account.getMe();
				const value = await FileStream.load(slice.file.id, []);

				if (!value || !me.canRead(value)) {
					throw new Error(`Can't access this face slice`);
				}
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
				// Convoluted stuff below to make Typescript happy when I just don't care about the error.
				if (e) return;
				return;
				// console.log('Face processing error:', e);
				// This is normal behaviour if the user doesn't have permission to view the face slice
			}
		});

		// Wait for all slices to complete or timeout
		await Promise.allSettled(slicePromises);
	}

	// Explicitly return to ensure promise resolution
	return true;
}
