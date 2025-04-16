<script lang="ts">
	import {
		drawFaceRectangles,
		drawSelectionRectangle,
		redrawCanvas,
		renderBlurredCanvas
	} from '$lib/utils/canvasUtils';
	import type { FaceData } from '$lib/utils/faceDetection';
	import toast from '@natoune/svelte-daisyui-toast';
	let {
		canvas = $bindable(),
		readyState = $bindable(),
		faceList = $bindable(),
		originalCanvas
	}: {
		canvas: HTMLCanvasElement | undefined;
		readyState: 'no image' | 'working' | 'ready';
		faceList: FaceData[];
		originalCanvas: HTMLCanvasElement | undefined;
	} = $props();
	// Add drawing state
	let isDrawing = $state(false);
	let drawStart = $state({ x: 0, y: 0 });
	let drawCurrent = $state({ x: 0, y: 0 });
	let offscreenCanvas: HTMLCanvasElement | undefined = $state();

	// Function to get accurate mouse position in canvas coordinates
	const getMousePos = (canvas: HTMLCanvasElement, evt: MouseEvent | Touch) => {
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		return {
			x: (evt.clientX - rect.left) * scaleX,
			y: (evt.clientY - rect.top) * scaleY
		};
	};

	// Function to handle drawing on canvas
	const startDrawing = (e: MouseEvent | TouchEvent) => {
		try {
			if (!canvas) throw new Error('Something went wrong.');
			// Prevent default behavior to avoid scrolling on touch devices
			e.preventDefault();

			// Duplicate the DOM canvas to an offscreen one
			offscreenCanvas = document.createElement('canvas');
			offscreenCanvas.width = canvas.width;
			offscreenCanvas.height = canvas.height;
			const ctx = offscreenCanvas.getContext('2d');
			ctx?.drawImage(canvas, 0, 0);

			isDrawing = true;

			// Get mouse/touch position in canvas coordinates
			const pos = getMousePos(canvas, e instanceof MouseEvent ? e : e.touches[0]);

			// Store actual pixel coordinates
			drawStart = pos;
			drawCurrent = pos;
		} catch (e: unknown) {
			console.error(e);
			if (e instanceof Error) {
				toast.error(e.message, { duration: 3000 });
			}
		}
	};

	const continueDrawing = (e: MouseEvent | TouchEvent) => {
		if (!isDrawing || !canvas || !offscreenCanvas) return null;

		// Prevent default behavior to avoid scrolling on touch devices
		e.preventDefault();

		// Get mouse/touch position in canvas coordinates
		const pos = getMousePos(canvas, e instanceof MouseEvent ? e : e.touches[0]);

		drawCurrent = pos;
		requestAnimationFrame(() => {
			const ctx = canvas?.getContext('2d');
			if (!canvas || !offscreenCanvas || !ctx) return null;
			redrawCanvas(offscreenCanvas, canvas);
			drawSelectionRectangle(
				ctx,
				Math.min(drawStart.x, drawCurrent.x),
				Math.min(drawStart.y, drawCurrent.y),
				Math.max(drawCurrent.x, drawStart.x),
				Math.max(drawCurrent.y, drawStart.y)
			);
		});
	};

	const stopDrawing = async () => {
		if (!isDrawing || !canvas || !offscreenCanvas || !originalCanvas) return null;

		isDrawing = false;

		// Only create a face slice if the area is large enough
		const width = Math.abs(drawCurrent.x - drawStart.x);
		const height = Math.abs(drawCurrent.y - drawStart.y);

		if (width > 20 && height > 20) {
			// Create a new face slice from the drawn area
			const ctx = originalCanvas.getContext('2d');
			if (!ctx) throw new Error('Canvas context is null');

			// Convert canvas coordinates to normalized coordinates (0-1)
			const x = Math.min(drawStart.x, drawCurrent.x) / canvas.width;
			const y = Math.min(drawStart.y, drawCurrent.y) / canvas.height;
			const normalizedWidth = width / canvas.width;
			const normalizedHeight = height / canvas.height;

			// Convert normalized coordinates to original canvas pixel values
			const pixelX = Math.floor(x * originalCanvas.width);
			const pixelY = Math.floor(y * originalCanvas.height);
			const pixelWidth = Math.ceil(normalizedWidth * originalCanvas.width);
			const pixelHeight = Math.ceil(normalizedHeight * originalCanvas.height);

			const imageData = ctx.getImageData(pixelX, pixelY, pixelWidth, pixelHeight);

			// Create a new face data object with normalized coordinates
			const newFace: FaceData = {
				x,
				y,
				width: normalizedWidth,
				height: normalizedHeight,
				originalImageData: imageData,
				person: { id: null }
			};

			// Add to face list
			faceList = [...faceList, newFace];
			await renderBlurredCanvas(originalCanvas, canvas, faceList);
			drawFaceRectangles(canvas, faceList);
		}
	};
</script>

<div style="width: 100%; aspect-ratio: auto;">
	<canvas
		bind:this={canvas}
		class={readyState === 'ready' ? 'shadow-md' : ''}
		style="width: 100%; height: {readyState === 'ready' ? 'auto' : 'auto'}; touch-action: none;"
		onmousedown={startDrawing}
		onmousemove={continueDrawing}
		onmouseup={stopDrawing}
		onmouseleave={stopDrawing}
		ontouchstart={startDrawing}
		ontouchmove={continueDrawing}
		ontouchend={stopDrawing}
	></canvas>
</div>
