import { FileStream, ImageDefinition, type ID } from 'jazz-tools';
import type { ListOfFaceSlices } from '$lib/schema';
import Pica from 'pica';
import { onDestroy } from 'svelte';
import { drawFaceRectangles } from './canvasUtils';
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
		console.error({ e });
		throw new Error('Error loading blob');
	}
};

export function useProgressiveImg({
	image,
	maxWidth,
	targetWidth
}: {
	image: ImageDefinition | null | undefined;
	maxWidth?: number;
	targetWidth?: number;
}) {
	let current = $state<{
		src?: string;
		res?: `${number}x${number}` | 'placeholder';
	}>();
	const originalSize = $state(image?.originalSize);

	const unsubscribe = image?.subscribe({}, (update) => {
		const highestRes = update?.highestResAvailable({ maxWidth, targetWidth });
		if (highestRes) {
			if (highestRes.res !== current?.res) {
				const blob = highestRes.stream.toBlob();
				if (blob) {
					const blobURI = URL.createObjectURL(blob);
					current = { src: blobURI, res: highestRes.res };

					// Cleanup previous blob URL
					setTimeout(() => URL.revokeObjectURL(blobURI), 200); // Give firefox time.
				}
			}
		} else {
			current = {
				src: update?.placeholderDataURL,
				res: 'placeholder'
			};
		}
	});

	// Cleanup subscription
	onDestroy(() => () => {
		unsubscribe?.();
	});

	return {
		get src() {
			return current?.src;
		},
		get res() {
			return current?.res;
		},

		originalSize
	};
}

export async function renderCanvas(
	canvas: HTMLCanvasElement,
	src: string,
	faceSlices: ListOfFaceSlices | null | undefined
) {
	if (!canvas) return null;
	const offscreen = document.createElement('canvas');
	const ctx = offscreen.getContext('2d');

	// Determine the best image size to use based on the canvas width
	if (!ctx || !src) throw new Error('No context or no photo file.');

	// Set rendering quality
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';

	const img = new Image();
	await new Promise((resolve) => {
		img.src = src;
		img.onload = (r) => {
			resolve(r);
		};
	});
	const naturalDimensions = {
		w: img.naturalWidth,
		h: img.naturalHeight
	};
	offscreen.width = img.width;
	offscreen.height = img.height;
	canvas.height = canvas.width * (naturalDimensions.h / naturalDimensions.w);
	ctx.drawImage(img, 0, 0);
	// In the renderCanvas function, ensure we're correctly processing face slices
	drawFaceRectangles(offscreen, faceSlices);

	// In renderCanvas function, update the face slice rendering section:
	// In renderCanvas function, update the face slice rendering section:
	if (faceSlices) {
		const slicePromises = faceSlices.map(async (slice) => {
			if (!slice?.x || !slice?.y || !slice?.width || !slice?.height) return null;

			// Add 1px buffer to prevent edge artifacts
			const pixelX = Math.max(0, Math.round(slice.x * offscreen.width) - 1);
			const pixelY = Math.max(0, Math.round(slice.y * offscreen.height) - 1);
			const pixelWidth = Math.min(
				offscreen.width - pixelX,
				Math.round(slice.width * offscreen.width) + 2
			);
			const pixelHeight = Math.min(
				offscreen.height - pixelY,
				Math.round(slice.height * offscreen.height) + 2
			);

			try {
				// Direct image loading code instead of using useProgressiveImg
				let imgSrc: string | undefined;

				if (slice.image) {
					// Request a slightly larger image to avoid edge artifacts
					const highestRes = slice.image.highestResAvailable({
						maxWidth: canvas.width * 20
					});
					if (highestRes) {
						const blob = highestRes.stream.toBlob();
						if (blob) {
							imgSrc = URL.createObjectURL(blob);
						}
					} else if (slice.image.placeholderDataURL) {
						imgSrc = slice.image.placeholderDataURL;
					}
				}

				if (!imgSrc) return; // Couldn't load this. User likely has no permission to view.

				const img = new Image();
				await new Promise((resolve, reject) => {
					img.src = imgSrc;
					img.onload = () => {
						resolve(null);
						// Clean up the blob URL after we're done with it
						setTimeout(() => URL.revokeObjectURL(imgSrc), 200);
					};
					img.onerror = reject;
				});

				// Apply image rendering with high quality settings
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = 'high';

				// Draw the image with precise dimensions
				// Draw with 1px overlap to prevent seams
				ctx.drawImage(
					img,
					0,
					0,
					img.naturalWidth,
					img.naturalHeight,
					pixelX,
					pixelY,
					pixelWidth,
					pixelHeight
				);
			} catch (e) {
				console.error('Error loading face slice:', e);
			}
		});
		await Promise.allSettled(slicePromises);
	}
	const pica = new Pica({
		tile: 1024,
		features: ['all']
	});

	await pica.resize(offscreen, canvas, {
		filter: 'lanczos2'
	});
	return null;
}
