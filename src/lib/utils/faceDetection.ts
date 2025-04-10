import type { BrightBlurProfile } from '$lib/schema';
import toast from '@natoune/svelte-daisyui-toast';
import { drawFaceRectangles } from './canvasUtils';

type Canvas = HTMLCanvasElement | null;
export type FaceData = {
	x: number;
	y: number;
	width: number;
	height: number;
	originalImageData: ImageData;
	person: BrightBlurProfile | { id: null };
};

type CanvasSet = {
	dom: Canvas | undefined;
	original: Canvas | undefined;
	offscreen: Canvas | undefined;
};

/**
 * Process an uploaded image file to detect faces
 */
export async function processImageForFaces(canvas: Canvas): Promise<FaceData[]> {
	if (!canvas) throw new Error('No canvas passed');
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Could not get canvas context');
	// Detect faces
	const faceapi = await import ('face-api.js');
	const detections = await faceapi
		.detectAllFaces(
			canvas,
			new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.4 })
		)
		.withFaceLandmarks()
		.withFaceDescriptors();

	// Extract face data
	const faceList: FaceData[] = [];
	console.log(detections);
	detections.forEach((detection) => {
		const box = detection.detection.box;
		if (canvas) {
			// Convert to decimal coordinates (0-1 range)
			const x = box.x / canvas.width;
			const y = box.y / canvas.height;
			const width = box.width / canvas.width;
			const height = box.height / canvas.height;
			const faceData = {
				x,
				y,
				width,
				height,
				originalImageData: ctx.getImageData(box.x, box.y, box.width, box.height),
				person: {
					id: null
				}
			};
			if (faceData) faceList.push(faceData);
		}
	});

	return faceList;
}

/**
 * Apply blur effect to faces in the image
 */
export function blurFaces(canvases: CanvasSet, faceList: FaceData[]): void {
	try {
		if (!canvases.original || !canvases.dom) throw new Error('Something went wrong.');
		const ctx = canvases.dom.getContext('2d');
		if (!ctx) throw new Error('Something went wrong.');

		// Initialize offscreen canvas if needed
		if (!canvases.offscreen) {
			canvases.offscreen = document.createElement('canvas');
			canvases.offscreen.width = canvases.original.width;
			canvases.offscreen.height = canvases.original.height;
		}

		const offscreenCtx = canvases.offscreen.getContext('2d', { willReadFrequently: true });
		if (!offscreenCtx) throw new Error('Something went wrong.');

		// Draw original image to offscreen canvas
		offscreenCtx.drawImage(
			canvases.original,
			0,
			0,
			canvases.offscreen.width,
			canvases.offscreen.height
		);

		// Apply pixelation to each face
		faceList.forEach((faceData) => {
			try {
				const { x, y, width, height } = faceData;
				const smallWidth = 6;
				const smallHeight = Math.ceil(6 * (width / height));
				const smallCanvas = new OffscreenCanvas(smallWidth, smallHeight);
				const smallCtx = smallCanvas.getContext('2d');
				if (!smallCtx || !canvases.offscreen) throw new Error('Something went wrong.');

				// Convert decimal coordinates to pixels for this canvas
				const pixelX = Math.floor(x * canvases.offscreen.width);
				const pixelY = Math.floor(y * canvases.offscreen.height);
				const pixelWidth = Math.ceil(width * canvases.offscreen.width);
				const pixelHeight = Math.ceil(height * canvases.offscreen.height);

				// Draw the face onto the small canvas
				smallCtx.drawImage(
					canvases.offscreen,
					pixelX,
					pixelY,
					pixelWidth,
					pixelHeight,
					0,
					0,
					smallWidth,
					smallHeight
				);

				// Draw the small canvas back to the offscreen canvas (pixelated)
				offscreenCtx.imageSmoothingEnabled = false;
				offscreenCtx.drawImage(
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
				offscreenCtx.imageSmoothingEnabled = true;
			} catch (e: unknown) {
				console.error(e);
				if (e instanceof Error) {
					toast.error(e.message, { duration: 3000 });
				}
			}
		});

		// Update the DOM canvas with the blurred image
		canvases.dom.width = canvases.original.width;
		canvases.dom.height = canvases.original.height;
		ctx.clearRect(0, 0, canvases.dom.width, canvases.dom.height);
		ctx.drawImage(
			canvases.offscreen,
			0,
			0,
			canvases.offscreen.width,
			canvases.offscreen.height,
			0,
			0,
			canvases.dom.width,
			canvases.dom.height
		);

		// Draw rectangles around faces
		drawFaceRectangles(canvases.dom, faceList);
	} catch (e: unknown) {
		console.error(e);
		if (e instanceof Error) {
			toast.error(e.message, {
				duration: 3000
			});
		}
	}
}

/**
 * Create a blob from the offscreen canvas
 */
export async function createImageBlob(offscreenCanvas: HTMLCanvasElement | null): Promise<Blob> {
	if (!offscreenCanvas) throw new Error('No offscreen canvas available');

	return new Promise((resolve, reject) => {
		offscreenCanvas.toBlob((blob) => {
			if (!blob) reject(new Error('Failed to create blob'));
			else resolve(blob);
		}, 'image/jpeg');
	});
}
