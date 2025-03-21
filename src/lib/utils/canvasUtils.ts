import * as faceapi from 'face-api.js';
import toast from '@natoune/svelte-daisyui-toast';
import type { FaceData } from './faceDetection';
import Pica from 'pica';
import { FileStream, type Group } from 'jazz-tools';
import { Image, ListOfImages } from '$lib/schema';

export function drawSelectionRectangle(
	ctx: CanvasRenderingContext2D,
	startX: number,
	startY: number,
	currentX: number,
	currentY: number
) {
	ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-primary');
	ctx.lineWidth = 2; // Static 2px width
	ctx.beginPath();
	ctx.roundRect(
		Math.min(startX, currentX),
		Math.min(startY, currentY),
		Math.abs(currentX - startX),
		Math.abs(currentY - startY),
		4
	);
	ctx.stroke();
}

export function drawFaceRectangles(canvas: HTMLCanvasElement, faceList: FaceData[]) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	faceList.forEach((faceData) => {
		const { x, y, width, height } = faceData;
		drawSelectionRectangle(
			ctx,
			x * canvas.width,
			y * canvas.height,
			(x + width) * canvas.width,
			(y + height) * canvas.height
		);
	});
}
// Take a blob, and return a full size canvas
export async function blobToCanvas(blob: Blob | undefined): Promise<HTMLCanvasElement> {
	return new Promise((resolve, reject) => {
		try {
			const canvas = document.createElement('canvas');
			if (!blob) return canvas; // Garbage In, Garbage Out
			faceapi
				.bufferToImage(blob)
				.then((img) => {
					const displaySize = { width: img.width, height: img.height };
					// Setup original canvas
					canvas.width = displaySize.width;
					canvas.height = displaySize.height;
					const originalCtx = canvas.getContext('2d');
					if (!originalCtx) throw new Error('Could not get original canvas context');
					originalCtx.drawImage(img, 0, 0, displaySize.width, displaySize.height);
					resolve(canvas);
				})
				.catch((e) => {
					throw new Error(e);
				});
		} catch (e) {
			reject(e);
		}
	});
}

export async function renderBlurredCanvas(
	sourceCanvas: HTMLCanvasElement,
	targetCanvas: HTMLCanvasElement,
	faceSlices?: FaceData[]
) {
	const tempCanvas = document.createElement('canvas');
	tempCanvas.width = sourceCanvas.width;
	tempCanvas.height = sourceCanvas.height;
	const tempCtx = tempCanvas.getContext('2d');
	if (!tempCtx) throw new Error('Something went wrong.');

	tempCtx.drawImage(sourceCanvas, 0, 0);
	const targetCtx = targetCanvas.getContext('2d');
	if (!targetCtx) throw new Error('Could not get target canvas context');
	targetCanvas.height = (targetCanvas.width * tempCanvas.height) / tempCanvas.width;
	const pica = new Pica({
		tile: 1024,
		features: ['all']
	});
	await pica.resize(tempCanvas, targetCanvas, {
		filter: 'lanczos2'
	});
	targetCtx.imageSmoothingEnabled = false; // Disable image smoothing for pixelated effect
	if (faceSlices) {
		await Promise.all(
			faceSlices.map(async (faceData) => {
				try {
					const { x, y, width, height } = faceData;
					const smallWidth = 6;
					const smallHeight = Math.ceil(6 * (width / height));
					const smallCanvas = document.createElement('canvas');
					smallCanvas.width = smallWidth;
					smallCanvas.height = smallHeight;
					const smallCtx = smallCanvas.getContext('2d');
					if (!smallCtx) throw new Error('Something went wrong.');

					// Convert decimal coordinates to pixels for this canvas
					const pixelX = Math.floor(x * targetCanvas.width);
					const pixelY = Math.floor(y * targetCanvas.height);
					const pixelWidth = Math.ceil(width * targetCanvas.width);
					const pixelHeight = Math.ceil(height * targetCanvas.height);

					// Draw the face onto the small canvas
					smallCtx.imageSmoothingEnabled = false; // Disable image smoothing for pixelated effect
					smallCtx.drawImage(
						targetCanvas,
						pixelX,
						pixelY,
						pixelWidth,
						pixelHeight,
						0,
						0,
						smallWidth,
						smallHeight
					);

					// Draw the small canvas back to the target canvas (pixelated)
					targetCtx.drawImage(
						smallCanvas,
						0,
						0,
						smallWidth,
						smallHeight,
						pixelX,
						pixelY,
						pixelWidth,
						pixelHeight
					);
				} catch (e: unknown) {
					console.error(e);
					if (e instanceof Error) {
						toast.error(e.message, { duration: 3000 });
					}
				}
			})
		);
	}

	targetCtx.imageSmoothingEnabled = true; // Re-enable smoothing for the final image
	return;
}

// Function to generate multiple image sizes
// Add proper type for generateResizedImages function
export async function generateResizedImages(
	sourceCanvas: HTMLCanvasElement,
	desiredSizes: number[],
	ownerGroup: Group,
	faceList?: FaceData[]
): Promise<ListOfImages> {
	const pica = new Pica({
		tile: 512,
		features: ['all']
	});
	const images = ListOfImages.create([], ownerGroup);
	const originalWidth = sourceCanvas.width;
	const originalHeight = sourceCanvas.height;
	const targetSizes = desiredSizes.filter((el) => el < originalWidth);
	targetSizes.unshift(originalWidth);
	const canvases = await Promise.all(
		targetSizes.map(async (el) => {
			const canvas = document.createElement('canvas');
			canvas.width = el;
			canvas.height = el * (originalHeight / originalWidth);
			await renderBlurredCanvas(sourceCanvas, canvas, faceList);
			return {
				size: el,
				canvas
			};
		})
	);

	for (const canvas of canvases) {
		const blob = await pica.toBlob(canvas.canvas, 'image/jpeg', 0.9);
		const resizedFile = await FileStream.createFromBlob(blob, {
			owner: ownerGroup
		});
		const resizedImage = Image.create(
			{
				size: canvas.size,
				file: resizedFile
			},
			{ owner: ownerGroup }
		);
		images.push(resizedImage);
	}
	return images;
}

export const redrawCanvas = (
	sourceCanvas: HTMLCanvasElement,
	destinationCanvas: HTMLCanvasElement
) => {
	if (!sourceCanvas || !destinationCanvas) throw new Error('No canvas');

	const ctx = destinationCanvas.getContext('2d');
	if (!ctx) throw new Error('Missing canvas context');

	// Redraw the canvas with the current selection rectangle
	// I was clearing the canvas first this before, but there's no reason to because the image will be drawn fully over the old canvas anyway
	// ctx.clearRect(0, 0, destinationCanvas.width, destinationCanvas.height);
	ctx.drawImage(sourceCanvas, 0, 0);
};
