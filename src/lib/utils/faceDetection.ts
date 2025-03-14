import type { BrightBlurProfile } from '$lib/schema';
import toast from '@natoune/svelte-daisyui-toast';
import * as faceapi from 'face-api.js';

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
	offscreen: OffscreenCanvas | undefined;
};

/**
 * Initialize face detection by loading the required models
 */
export async function initFaceDetection(): Promise<boolean> {
	try {
		await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
		return true;
	} catch (e) {
		console.error('Failed to load face detection models:', e);
		return false;
	}
}

/**
 * Process an uploaded image file to detect faces
 */
export async function processImageForFaces(
	file: File,
	canvases: CanvasSet
): Promise<{ faceList: FaceData[]; displaySize: { width: number; height: number } }> {
	const img = await faceapi.bufferToImage(file);
	const displaySize = { width: img.width, height: img.height };

	// Setup original canvas
	canvases.original = document.createElement('canvas');
	canvases.original.width = displaySize.width;
	canvases.original.height = displaySize.height;
	const originalCtx = canvases.original.getContext('2d');
	if (!originalCtx) throw new Error('Could not get original canvas context');
	originalCtx.drawImage(img, 0, 0, displaySize.width, displaySize.height);

	// Setup DOM canvas
	if (canvases.dom) {
		canvases.dom.width = displaySize.width;
		canvases.dom.height = displaySize.height;
		const domCtx = canvases.dom.getContext('2d');
		if (!domCtx) throw new Error('Could not get DOM canvas context');
		domCtx.drawImage(img, 0, 0, displaySize.width, displaySize.height);
	}

	// Detect faces
	const detections = await faceapi.detectAllFaces(
		img,
		new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.4 })
	);

	// Extract face data
	const faceList: FaceData[] = [];
	detections.forEach((detection) => {
		const box = detection.box;
		if (canvases.original) {
			// Convert to decimal coordinates (0-1 range)
			const x = box.x / displaySize.width;
			const y = box.y / displaySize.height;
			const width = box.width / displaySize.width;
			const height = box.height / displaySize.height;
			const faceData = extractFaceData(x, y, width, height, canvases.original, displaySize);
			if (faceData) faceList.push(faceData);
		}
	});

	return { faceList, displaySize };
}

export function extractFaceData(
	x: number,
	y: number,
	width: number,
	height: number,
	originalCanvas: HTMLCanvasElement | null,
	displaySize: { width: number; height: number }
): FaceData | null {
	if (!originalCanvas) return null;
	const ctx = originalCanvas.getContext('2d');
	if (!ctx) return null;

	// Convert decimal coordinates back to pixels for image data extraction
	const pixelX = Math.max(Math.floor(x * displaySize.width), 0);
	const pixelY = Math.max(Math.floor(y * displaySize.height), 0);
	const pixelWidth = Math.min(Math.ceil(width * displaySize.width), displaySize.width - pixelX);
	const pixelHeight = Math.min(Math.ceil(height * displaySize.height), displaySize.height - pixelY);

	return {
		x,
		y,
		width,
		height,
		originalImageData: ctx.getImageData(pixelX, pixelY, pixelWidth, pixelHeight),
		person: {
			id: null
		}
	};
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
			canvases.offscreen = new OffscreenCanvas(canvases.original.width, canvases.original.height);
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
		faceList.forEach((faceData) => {
			if (!canvases.dom) return;
			const { x, y, width, height } = faceData;
			// Convert decimal coordinates to pixels for the DOM canvas
			const pixelX = x * canvases.dom.width;
			const pixelY = y * canvases.dom.height;
			const pixelWidth = width * canvases.dom.width;
			const pixelHeight = height * canvases.dom.height;

			ctx.lineWidth = pixelWidth / 24;
			ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue(
				'--color-primary'
			);
			ctx.beginPath();
			ctx.roundRect(pixelX, pixelY, pixelWidth, pixelHeight, pixelWidth / 24);
			ctx.stroke();
		});
	} catch (e: unknown) {
		console.log(e);
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
