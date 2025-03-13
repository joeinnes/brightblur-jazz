import { Account, FileStream, type ID } from 'jazz-tools';
import type { Photo } from '$lib/schema';
import Pica from 'pica';
export function imageDataToFile(imageData: ImageData, filename = 'image.jpeg'): Promise<File> {
	// Create a temporary canvas to draw the image data
	const canvas = document.createElement('canvas');
	canvas.width = imageData.width;
	canvas.height = imageData.height;
	const ctx = canvas.getContext('2d');

	if (!ctx) throw new Error('No context'); // TODO: throw an error
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
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
	naturalDimensions: { w: number; h: number },
	fullSize = false
) {
	const offscreen = document.createElement('canvas');
	const ctx = offscreen.getContext('2d');
	const fileId = fullSize && photo.fullSizeFile?.id ? photo.fullSizeFile?.id : photo.file?.id;

	if (!ctx || !fileId) throw new Error('No context or no photo file.');

	// Set rendering quality
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';

	const mainImage = await getFile(fileId);
	if (!mainImage) throw new Error('No main image');

	naturalDimensions.w = mainImage.width;
	naturalDimensions.h = mainImage.height;
	offscreen.width = mainImage.width;
	offscreen.height = mainImage.height;
	canvas.height = canvas.width * (naturalDimensions.h / naturalDimensions.w);

	// Clear any previous content and ensure clean rendering
	ctx.clearRect(0, 0, offscreen.width, offscreen.height);
	ctx.drawImage(mainImage, 0, 0);

	const primaryColour = getComputedStyle(document.documentElement)
		.getPropertyValue('--color-primary')
		.trim();
	ctx.strokeStyle = primaryColour;

	if (photo.faceSlices) {
		// Create an array of promises for each slice
		const slicePromises = photo.faceSlices.map(async (slice) => {
			if (!slice?.x || !slice?.y || !slice?.width || !slice?.height) return null;

			// Convert decimal coordinates to pixel values based on canvas dimensions
			const pixelX = Math.floor(slice.x * offscreen.width);
			const pixelY = Math.floor(slice.y * offscreen.height);
			const pixelWidth = Math.ceil(slice.width * offscreen.width);
			const pixelHeight = Math.ceil(slice.height * offscreen.height);

			const lineWidth = Math.floor(Math.max(pixelWidth / 24, 2));
			ctx.lineWidth = lineWidth;

			// Adjust border position to be fully under the face image
			const radius = Math.floor(pixelWidth / 24);

			ctx.beginPath();
			ctx.roundRect(
				pixelX + lineWidth / 2,
				pixelY + lineWidth / 2,
				pixelWidth - lineWidth,
				pixelHeight - lineWidth,
				radius
			);
			ctx.stroke();

			if (!slice?.file?.id) return null;

			// Handle face image loading with timeout to prevent hanging
			try {
				const me = Account.getMe();
				const value = await FileStream.load(slice.file.id, []);

				if (!value || !me.canRead(value)) {
					throw new Error(`Can't access this face slice`);
				}
				const faceImage = await getFile(slice.file.id);

				if (faceImage) {
					// Apply image rendering with high quality settings
					ctx.imageSmoothingEnabled = true;
					ctx.imageSmoothingQuality = 'high';

					ctx.drawImage(faceImage, pixelX, pixelY, pixelWidth, pixelHeight);
				}
			} catch (e: unknown) {
				// Convoluted stuff below to make Typescript happy when I just don't care about the error.
				if (e || !e) return null;
			}
		});

		// Wait for all slices to complete or timeout
		await Promise.allSettled(slicePromises);
		const pica = new Pica({
			tile: 1024,
			features: ['all']
		});

		await pica.resize(offscreen, canvas, {
			filter: 'lanczos2' // Hamming gives the best performance, although still not great from a cold start.
		});
	}

	// Explicitly return to ensure promise resolution
	return true;
}
