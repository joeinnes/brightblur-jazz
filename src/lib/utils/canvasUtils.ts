import toast from '@natoune/svelte-daisyui-toast';
import type { FaceData } from './faceDetection';
import Pica from 'pica';
import type { ListOfFaceSlices } from '$lib/schema';

export function drawSelectionRectangle(
	ctx: CanvasRenderingContext2D,
	startX: number,
	startY: number,
	currentX: number,
	currentY: number
) {
	ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-primary');
	ctx.lineWidth = ctx.canvas.width * 0.01;
	ctx.beginPath();

	// Calculate the half line width to inset the stroke properly
	const halfLineWidth = Math.round(ctx.lineWidth / 2);

	// Calculate the rectangle coordinates with proper inset
	const x = Math.round(Math.min(startX, currentX) + halfLineWidth);
	const y = Math.round(Math.min(startY, currentY) + halfLineWidth);
	const width = Math.round(Math.abs(currentX - startX) - ctx.lineWidth);
	const height = Math.round(Math.abs(currentY - startY) - ctx.lineWidth);

	ctx.roundRect(x, y, width, height, 4);
	ctx.stroke();
}

export function drawFaceRectangles(
	canvas: HTMLCanvasElement,
	faceList: ListOfFaceSlices | FaceData[] | undefined | null
) {
	if (!faceList) return;
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	faceList.forEach((faceData) => {
		if (!faceData?.x || !faceData?.y || !faceData?.width || !faceData?.height) return;
		const { x, y, width, height } = faceData;

		// Calculate coordinates with bounds checking
		const startX = Math.max(0, x * canvas.width);
		const startY = Math.max(0, y * canvas.height);
		const endX = Math.min(canvas.width, (x + width) * canvas.width);
		const endY = Math.min(canvas.height, (y + height) * canvas.height);

		// Only draw if we have a valid rectangle
		if (endX > startX && endY > startY) {
			drawSelectionRectangle(ctx, startX, startY, endX, endY);
		}
	});
}
// Take a blob, and return a full size canvas
export async function blobToCanvas(blob: Blob | undefined): Promise<HTMLCanvasElement> {
	return new Promise((resolve, reject) => {
		try {
			const canvas = document.createElement('canvas');
			if (!blob) return canvas; // Garbage In, Garbage Out
			import('face-api.js').then((faceapi) => {
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

					// Convert decimal coordinates to pixels with bounds checking
					const pixelX = Math.max(0, Math.round(x * targetCanvas.width));
					const pixelY = Math.max(0, Math.round(y * targetCanvas.height));
					const pixelWidth = Math.min(
						targetCanvas.width - pixelX,
						Math.round(width * targetCanvas.width)
					);
					const pixelHeight = Math.min(
						targetCanvas.height - pixelY,
						Math.round(height * targetCanvas.height)
					);

					// Only proceed if we have valid dimensions
					if (pixelWidth <= 0 || pixelHeight <= 0) return;

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
