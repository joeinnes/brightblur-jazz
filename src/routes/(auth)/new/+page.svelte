<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Group, FileStream, type ID, Account } from 'jazz-tools';
	import { useCoState } from 'jazz-svelte';
	import * as faceapi from 'face-api.js';
	import toast from '@natoune/svelte-daisyui-toast';

	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';

	import { Photo, FaceSlice, ListOfFaceSlices, GlobalData, Image, ListOfImages } from '$lib/schema';
	import { imageDataToFile } from '$lib/utils/imageData';
	import { processImageForFaces, type FaceData } from '$lib/utils/faceDetection';
	import { extractAllPeople } from '$lib/utils/profileUtils';
	import {
		blobToCanvas,
		drawFaceRectangles,
		drawSelectionRectangle,
		generateResizedImages,
		renderBlurredCanvas
	} from '$lib/utils/canvasUtils';

	import Autocomplete from '$lib/components/Autocomplete.svelte';
	import ImageUpload from '$lib/components/ImageUpload.svelte';

	// Get global data for people and photos
	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			people: [],
			photos: []
		})
	);

	// Extract list of people from global data
	let listOfPeople = $derived(extractAllPeople(globalData));

	// Canvas state management
	let canvases: {
		dom: HTMLCanvasElement | undefined;
		original: HTMLCanvasElement | undefined;
		offscreen: HTMLCanvasElement | undefined;
	} = $state({
		dom: undefined, // Canvas displayed to the user
		original: undefined, // Holds the original full image
		offscreen: undefined // Holds a full size version of the DOM canvas
	});

	// Face detection results
	let faceList: FaceData[] = $state([]);

	// Component state
	let ready = $state({
		img: false,
		faceapi: false,
		preview: 'no image'
	});

	let croppedBlob: Blob | undefined = $state();

	let originalCanvas = $derived(blobToCanvas(croppedBlob));

	// Update the face list when the cropped blob changes
	$effect(() => {
		originalCanvas
			.then(async (canvas) => {
				ready.preview = 'working';
				canvases.original = canvas;
				faceList = await processImageForFaces(canvas);
				if (!canvases.dom) return;
				await renderBlurredCanvas(canvas, canvases.dom, faceList);
				drawFaceRectangles(canvases.dom, faceList);
				ready.preview = 'ready';
			})
			.catch((error: unknown) => {
				console.error('Error processing image:', error);
				if (error instanceof Error) {
					toast.error(error.message, { duration: 3000 });
				}
				ready.preview = 'no image';
			});
	});

	// Handle form submission
	const submitHandler = async (e: Event) => {
		e.preventDefault();
		try {
			const canvas = await originalCanvas;
			if (!canvas) throw new Error('Something went wrong.');
			// Create public group for photo access
			const publicGroup = Group.create();
			publicGroup.addMember('everyone', 'reader');
			// Define the target sizes we want to generate
			const targetSizes = [320, 1024, 2048, 4096];
			// Generate multiple sizes for the main photo
			const photoImages = await generateResizedImages(canvas, targetSizes, publicGroup, faceList);
			// Create list of face slices
			const listOfFaceSlices = ListOfFaceSlices.create([], publicGroup);
			// Process each detected face
			for (const face of faceList) {
				if (!face.person) continue;
				const profile = listOfPeople?.find((profile) => profile.value.id === face.person.id);
				// Setup access groups
				const fileGroup = Group.create();
				const sliceGroup = Group.create();
				sliceGroup.addMember('everyone', 'reader');
				if (profile) {
					const parentGroup = profile.value._owner.castAs(Group) as Group;
					for (const member of parentGroup.members) {
						const userToAdd = await Account.load(member.id, []);
						if (userToAdd) {
							fileGroup.addMember(userToAdd, member.role);
						}
					}
				}

				// Create a canvas for the face slice
				const faceCanvas = document.createElement('canvas');
				faceCanvas.width = face.originalImageData.width;
				faceCanvas.height = face.originalImageData.height;
				const faceCtx = faceCanvas.getContext('2d');
				if (!faceCtx) throw new Error('Canvas context is null');
				faceCtx.putImageData(face.originalImageData, 0, 0);

				// Generate multiple sizes for the face slice
				const faceImages = await generateResizedImages(faceCanvas, targetSizes, fileGroup);

				// Create face slice with the new images array
				const faceSlice = FaceSlice.create(
					{
						x: face.x,
						y: face.y,
						width: face.width,
						height: face.height,
						person: profile?.value || null,
						images: faceImages
					},
					{ owner: sliceGroup }
				);

				listOfFaceSlices.push(faceSlice);
			}

			// Create the photo with all the generated images
			const photo = Photo.create(
				{
					images: photoImages,
					faceSlices: listOfFaceSlices
				},
				{
					owner: publicGroup
				}
			);

			// Add photo to global data (feed)
			globalData.current?.photos.push(photo);
			toast.success('Photo uploaded successfully!', {
				duration: 3000
			});
			await goto('/');
		} catch (e: unknown) {
			console.error('Error submitting photo:', e);
			if (e instanceof Error) {
				toast.error(e.message, { duration: 3000 });
			}
		}
	};

	// Initialize face detection on component mount
	onMount(() => {
		faceapi.nets.tinyFaceDetector
			.loadFromUri('/models')
			.then(() => {
				ready.faceapi = true;
			})
			.catch(() => {
				ready.faceapi = false;
			});
	});

	// Add drawing state
	let isDrawing = $state(false);
	let drawStart = $state({ x: 0, y: 0 });
	let drawCurrent = $state({ x: 0, y: 0 });

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
			if (!canvases.dom) throw new Error('Something went wrong.');
			// Prevent default behavior to avoid scrolling on touch devices
			e.preventDefault();

			// Duplicate the DOM canvas to an offscreen one
			canvases.offscreen = document.createElement('canvas');
			canvases.offscreen.width = canvases.dom.width;
			canvases.offscreen.height = canvases.dom.height;
			const ctx = canvases.offscreen.getContext('2d');
			ctx?.drawImage(canvases.dom, 0, 0);

			isDrawing = true;

			// Get mouse/touch position in canvas coordinates
			const pos = getMousePos(canvases.dom, e instanceof MouseEvent ? e : e.touches[0]);

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
		if (!isDrawing || !canvases.dom) return null;

		// Prevent default behavior to avoid scrolling on touch devices
		e.preventDefault();

		// Get mouse/touch position in canvas coordinates
		const pos = getMousePos(canvases.dom, e instanceof MouseEvent ? e : e.touches[0]);

		drawCurrent = pos;
		requestAnimationFrame(redrawCanvas);
	};

	const redrawCanvas = () => {
		if (!isDrawing || !canvases.dom) return null;

		const ctx = canvases.dom.getContext('2d');
		if (!ctx || !canvases.offscreen) throw new Error('Missing canvas context or offscreen canvas');

		// Redraw the canvas with the current selection rectangle
		ctx.clearRect(0, 0, canvases.dom.width, canvases.dom.height);
		ctx.drawImage(canvases.offscreen, 0, 0);

		// Set fixed line width before drawing
		ctx.lineWidth = 2;
		ctx.strokeStyle = 'var(--primary)';
		drawSelectionRectangle(
			ctx,
			Math.min(drawStart.x, drawCurrent.x),
			Math.min(drawStart.y, drawCurrent.y),
			Math.max(drawCurrent.x, drawStart.x),
			Math.max(drawCurrent.y, drawStart.y)
		);
	};

	const stopDrawing = async () => {
		if (!isDrawing || !canvases.dom || !canvases.original) return null;

		isDrawing = false;

		// Only create a face slice if the area is large enough
		const width = Math.abs(drawCurrent.x - drawStart.x);
		const height = Math.abs(drawCurrent.y - drawStart.y);

		if (width > 20 && height > 20) {
			// Create a new face slice from the drawn area
			const ctx = canvases.original.getContext('2d');
			if (!ctx) throw new Error('Canvas context is null');

			// Convert canvas coordinates to normalized coordinates (0-1)
			const x = Math.min(drawStart.x, drawCurrent.x) / canvases.dom.width;
			const y = Math.min(drawStart.y, drawCurrent.y) / canvases.dom.height;
			const normalizedWidth = width / canvases.dom.width;
			const normalizedHeight = height / canvases.dom.height;

			// Convert normalized coordinates to original canvas pixel values
			const pixelX = Math.floor(x * canvases.original.width);
			const pixelY = Math.floor(y * canvases.original.height);
			const pixelWidth = Math.ceil(normalizedWidth * canvases.original.width);
			const pixelHeight = Math.ceil(normalizedHeight * canvases.original.height);

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
			await renderBlurredCanvas(canvases.original, canvases.dom, faceList);
			drawFaceRectangles(canvases.dom, faceList);
		}
	};
</script>

{#if ready.faceapi}
	<form onsubmit={submitHandler} class="mb-24">
		<!-- mb-24 is needed to ensure the dock doesn't cover the submit button -->
		{#if ready.preview !== 'ready'}
			<ImageUpload readyState={ready.preview} bind:croppedBlob />
		{/if}

		<div style="width: 100%; aspect-ratio: auto;">
			<canvas
				bind:this={canvases.dom}
				class={ready.preview === 'ready' ? 'shadow-md' : ''}
				style="width: 100%; height: {ready.preview === 'ready'
					? 'auto'
					: 'auto'}; touch-action: none;"
				onmousedown={startDrawing}
				onmousemove={continueDrawing}
				onmouseup={stopDrawing}
				onmouseleave={stopDrawing}
				ontouchstart={startDrawing}
				ontouchmove={continueDrawing}
				ontouchend={stopDrawing}
			></canvas>
		</div>
		<div class="p-2">
			{#if ready.preview === 'ready'}
				<small class="opacity-60">Draw on the picture to add an area to blur</small>

				<ul class="list bg-base-100 rounded-box shadow-md">
					{#each faceList as face, i}
						{@const imgSize = 'size-20'}
						<li class="list-row items-center">
							<div class="select-none">
								{#await imageDataToFile(face.originalImageData)}
									<img class="{imgSize} rounded-box skeleton" alt="loading..." />
								{:then imageFile}
									{@const url = URL.createObjectURL(imageFile)}
									<img
										class="{imgSize} rounded-box object-cover"
										src={url}
										alt="Face {i + 1}"
										onload={() => URL.revokeObjectURL(url)}
									/>{/await}
							</div>
							<div>
								{#if listOfPeople && listOfPeople.length > 0}
									<!-- Remove these debug outputs -->
									<!-- {face.x}
								{face.y} -->
									<Autocomplete
										bind:selectedItem={faceList[i].person.id}
										imageData={face.originalImageData}
										{listOfPeople}
										people={globalData.current?.people}
										items={listOfPeople
											.filter((profile) => !!profile.value)
											.map((profile) => ({
												value: profile.value.id,
												label: profile.value.name
											}))}
										placeholder="Who is this?"
									/>
								{/if}
							</div>
							<button
								type="button"
								class="btn btn-neutral"
								onclick={async () => {
									if (!canvases.original || !canvases.dom) return null;
									faceList.splice(i, 1);
									await renderBlurredCanvas(canvases.original, canvases.dom, faceList);
									drawFaceRectangles(canvases.dom, faceList);
								}}
							>
								Don't blur
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			<button class="btn btn-primary mt-4" type="submit">Submit</button>
		</div>
	</form>
{/if}

<!-- OK let's break this down.

Stuff this page needs to do:

1. Allow user to upload image (New Upload Image component)
2. Allow user to crop image (Cropper component)
3. Allow user to draw on image (Canvas component)
4. Allow user to select faces (Face detection component)
5. Allow user to select people (Autocomplete component)
6. Allow user to submit image (Submit button)


I need the following functions:

Handle the image selection
Handle the successful crop
Identify faces in the image
Draw the canvas with blurred faces


 -->
