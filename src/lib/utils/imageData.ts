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

	// Determine the best image size to use based on the canvas width
	let fileId;

	if (fullSize) {
		// Use the original size if fullSize is requested
		fileId = photo.images?.[0]?.file?.id;
	} else if (photo.images && photo.images.length > 0) {
		// Find the best size that's larger than or equal to the canvas width
		const targetWidth = canvas.width;
		const sortedImages = [...photo.images].sort((a, b) => {
			if (!a?.size || !b?.size) return 0;
			return a.size - b.size;
		});

		// Find the smallest size that's larger than the target
		let bestImage = sortedImages[0]; // Default to smallest

		for (const img of sortedImages) {
			if (img && img.size >= targetWidth) {
				bestImage = img;
				break;
			}
			// Keep updating with larger sizes until we find one big enough
			bestImage = img;
		}

		if (!bestImage) throw new Error("Couldn't find a good image.");
		fileId = bestImage.file?.id;
	}

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

			// Find the appropriate face image based on the main image size we're using
			let faceImageId;

			if (slice.images && slice.images.length > 0) {
				// Find the main image size we're currently using
				const mainImageSize = photo.images?.find((img) => img?.file?.id === fileId)?.size;

				if (mainImageSize) {
					// Find the face image with the same size or closest smaller size
					const sortedFaceImages = [...slice.images].sort((a, b) => {
						if (!a?.size || !b?.size) return 0;
						return b.size - a.size; // Sort descending
					});

					for (const img of sortedFaceImages) {
						if (img && img.size <= mainImageSize) {
							faceImageId = img.file?.id;
							break;
						}
					}

					// If no suitable size found, use the smallest available
					if (!faceImageId && sortedFaceImages.length > 0) {
						faceImageId = sortedFaceImages[sortedFaceImages.length - 1]?.file?.id;
					}
				}
			}

			if (!faceImageId) return null;

			// Handle face image loading with timeout to prevent hanging
			try {
				const me = Account.getMe();
				const value = await FileStream.load(faceImageId, []);

				if (!value || !me.canRead(value)) {
					throw new Error(`Can't access this face slice`);
				}
				const faceImage = await getFile(faceImageId);

				if (faceImage) {
					// Apply image rendering with high quality settings
					ctx.imageSmoothingEnabled = true;
					ctx.imageSmoothingQuality = 'high';

					ctx.drawImage(faceImage, pixelX, pixelY, pixelWidth, pixelHeight);
				}
			} catch (e: unknown) {
				// Make Typescript happy when I just don't care about the error.
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
}
