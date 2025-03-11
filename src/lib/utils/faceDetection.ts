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
		const { x, y, width, height } = detection.box;
		if (canvases.original) {
			const faceData = extractFaceData(x, y, width, height, canvases.original);
			if (faceData) faceList.push(faceData);
		}
	});

	return { faceList, displaySize };
}

/**
 * Extract face data from coordinates
 */
export function extractFaceData(
	x: number,
	y: number,
	width: number,
	height: number,
	originalCanvas: HTMLCanvasElement | null
): FaceData | null {
	if (!originalCanvas) return null;
	const ctx = originalCanvas.getContext('2d');
	if (!ctx) return null;

	const blurX = Math.max(x, 0);
	const blurY = Math.max(y, 0);
	const blurWidth = Math.min(width, originalCanvas.width - blurX);
	const blurHeight = Math.min(height, originalCanvas.height - blurY);

	return {
		x: blurX,
		y: blurY,
		width: blurWidth,
		height: blurHeight,
		originalImageData: ctx.getImageData(blurX, blurY, blurWidth, blurHeight),
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

				// Draw the face onto the small canvas
				smallCtx.drawImage(canvases.offscreen, x, y, width, height, 0, 0, smallWidth, smallHeight);

				// Draw the small canvas back to the offscreen canvas (pixelated)
				offscreenCtx.imageSmoothingEnabled = false;
				offscreenCtx.drawImage(smallCanvas, 0, 0, smallWidth, smallHeight, x, y, width, height);
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
			const { x, y, width, height } = faceData;
			ctx.lineWidth = width / 24;
			ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue(
				'--color-primary'
			);
			ctx.beginPath();
			ctx.roundRect(x, y, width, height, width / 24);
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
