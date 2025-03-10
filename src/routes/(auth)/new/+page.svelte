<script lang="ts">
	import { onMount } from 'svelte';
	import { createImage } from 'jazz-browser-media-images';
	import { Group, FileStream, type ID, Account } from 'jazz-tools';
	import { Photo, FaceSlice, ListOfFaceSlices, GlobalData } from '$lib/schema';
	import { useCoState } from 'jazz-svelte';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import { imageDataToFile } from '$lib/utils/imageData';
	import ImagePlus from 'lucide-svelte/icons/image-plus';
	import LoadingSpinner from 'lucide-svelte/icons/loader-pinwheel';
	import Autocomplete from '$lib/components/Autocomplete.svelte';
	import { goto } from '$app/navigation';
	import {
		initFaceDetection,
		processImageForFaces,
		blurFaces,
		createImageBlob,
		type FaceData
	} from '$lib/utils/faceDetection';
	import { extractAllPeople } from '$lib/utils/profileUtils';
	import Cropper from 'svelte-easy-crop';
	import { cropImage, type CroppedAreaPixels } from '$lib/utils/cropUtils';
	import toast from '@natoune/svelte-daisyui-toast';

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
		dom: HTMLCanvasElement | null;
		original: HTMLCanvasElement | null;
		offscreen: HTMLCanvasElement | null;
	} = $state({
		dom: null, // Canvas displayed to the user
		original: null, // Holds the original full image
		offscreen: null // Holds a full size version of the DOM canvas
	});

	// Face detection results
	let faceList: FaceData[] = $state([]);

	// Component state
	let ready = $state({
		img: false,
		faceapi: false,
		preview: 'no image'
	});

	// Cropping state
	let cropperModal: HTMLDialogElement | undefined = $state();
	let cropInstance: Cropper | undefined = $state();
	let croppedAreaPixels: CroppedAreaPixels = $state({
		x: 0,
		y: 0,
		width: 0,
		height: 0
	});
	let originalFile: File | undefined = $state();

	// Add image aspect ratio state
	let imageAspect = $state<number | undefined>(undefined);

	// Update file selection handler to calculate aspect ratio
	const handleFileSelect = (e: Event & { currentTarget: HTMLInputElement }) => {
		const input = e.currentTarget;
		if (!input.files || !input.files[0]) return;

		originalFile = input.files[0];

		// Calculate aspect ratio from the original image
		const img = new Image();
		const url = URL.createObjectURL(input.files[0]);

		img.onload = () => {
			imageAspect = img.width / img.height;
			URL.revokeObjectURL(url);
			cropperModal?.show();
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			imageAspect = undefined;
			cropperModal?.show();
		};

		img.src = url;
	};

	// Process cropped image and detect faces
	const processCroppedImage = async (croppedBlob: Blob) => {
		ready.preview = 'working';

		try {
			// Convert blob to file
			const croppedFile = new File([croppedBlob], originalFile?.name || 'cropped-image.jpg', {
				type: 'image/jpeg'
			});

			const { faceList: detectedFaces } = await processImageForFaces(croppedFile, canvases);
			faceList = detectedFaces;
			blurFaces(canvases, faceList);
			ready.preview = 'ready';
		} catch (error) {
			console.error('Error processing image:', error);
			ready.preview = 'no image';
		}
	};

	// Handle crop completion
	const handleCropComplete = async () => {
		if (!originalFile) return;

		try {
			const croppedBlob = await cropImage(originalFile, croppedAreaPixels);
			cropperModal?.close();
			await processCroppedImage(croppedBlob);
		} catch (error) {
			console.error('Error cropping image:', error);
			ready.preview = 'no image';
		}
	};

	// Handle form submission
	const submitHandler = async (e: Event) => {
		e.preventDefault();
		const me = await Account.getMe();
		if (!canvases.offscreen) return;

		try {
			// Create blob from the offscreen canvas
			const file = await createImageBlob(canvases.offscreen);

			// Create public group for photo access
			const publicGroup = Group.create();
			publicGroup.addMember('everyone', 'reader');

			// Create list of face slices
			const listOfFaceSlices = ListOfFaceSlices.create([], publicGroup);
			// Process each detected face
			for (const face of faceList) {
				if (!face.person) continue;

				const profile = listOfPeople?.find((profile) => profile.value.id === face.person.id);
				if (!profile) continue;

				// Setup access groups
				const parentGroup = profile.value._owner.castAs(Group) as Group;
				const fileGroup = Group.create();
				const sliceGroup = Group.create();
				sliceGroup.addMember('everyone', 'reader');

				// Copy access permissions from parent group
				parentGroup.members.forEach(async (member) => {
					// 'everyone' does not get iterated over as part of the members array
					const userToAdd = await Account.load(member.id, []);
					if (userToAdd) {
						fileGroup.addMember(userToAdd, member.role);
					}
				});

				// Create file from face image data
				const faceFile = await imageDataToFile(face.originalImageData);
				const fileStream = await FileStream.createFromBlob(faceFile, { owner: fileGroup });

				// Create face slice
				const faceSlice = FaceSlice.create(
					{
						...face,
						file: fileStream,
						person: profile.value
					},
					{ owner: sliceGroup }
				);
				listOfFaceSlices.push(faceSlice);
			}

			// Create the main photo
			const image = await FileStream.createFromBlob(file, {
				owner: publicGroup
			});

			const photo = Photo.create(
				{
					file: image,
					faceSlices: listOfFaceSlices
				},
				{
					owner: publicGroup
				}
			);

			// Add photo to global data
			globalData.current?.photos.push(photo);
			toast.success('Photo uploaded successfully!', {
				duration: 3000
			});
			goto('/');
		} catch (e) {
			console.error('Error submitting photo:', e);
		}
	};

	// Initialize face detection on component mount
	onMount(async () => {
		ready.faceapi = await initFaceDetection();
	});

	// Add drawing state
	let isDrawing = $state(false);
	let drawStart = $state({ x: 0, y: 0 });
	let drawCurrent = $state({ x: 0, y: 0 });
	let drawingMode = $state(true); // Always enabled by default

	// Function to handle drawing on canvas
	const startDrawing = (e: MouseEvent | TouchEvent) => {
		if (!canvases.dom) return;

		isDrawing = true;
		const rect = canvases.dom.getBoundingClientRect();
		const x = (e instanceof MouseEvent ? e.clientX : e.touches[0].clientX) - rect.left;
		const y = (e instanceof MouseEvent ? e.clientY : e.touches[0].clientY) - rect.top;

		drawStart = { x, y };
		drawCurrent = { x, y };
	};

	const continueDrawing = (e: MouseEvent | TouchEvent) => {
		if (!isDrawing || !canvases.dom) return;

		const rect = canvases.dom.getBoundingClientRect();
		const x = (e instanceof MouseEvent ? e.clientX : e.touches[0].clientX) - rect.left;
		const y = (e instanceof MouseEvent ? e.clientY : e.touches[0].clientY) - rect.top;

		drawCurrent = { x, y };

		// Redraw the canvas with the current selection rectangle
		redrawCanvas();
	};

	const stopDrawing = () => {
		if (!isDrawing || !canvases.dom || !canvases.original) return;

		isDrawing = false;

		// Calculate the scaling factor between preview and original image
		const scaleX = canvases.original.width / canvases.dom.clientWidth;
		const scaleY = canvases.original.height / canvases.dom.clientHeight;

		// Calculate the rectangle in original image coordinates
		const x = Math.min(drawStart.x, drawCurrent.x) * scaleX;
		const y = Math.min(drawStart.y, drawCurrent.y) * scaleY;
		const width = Math.abs(drawCurrent.x - drawStart.x) * scaleX;
		const height = Math.abs(drawCurrent.y - drawStart.y) * scaleY;

		// Only create a face slice if the area is large enough
		if (width > 20 && height > 20) {
			// Create a new face slice from the drawn area
			const ctx = canvases.original.getContext('2d');
			if (!ctx) throw new Error('Canvas context is null');
			const imageData = ctx.getImageData(x, y, width, height);

			// Create a new face data object
			const newFace: FaceData = {
				x,
				y,
				width,
				height,
				originalImageData: imageData,
				person: { id: null }
			};

			// Add to face list
			faceList = [...faceList, newFace];

			// Redraw with the new face
			blurFaces(canvases, faceList);
		}
	};

	const redrawCanvas = () => {
		if (!canvases.dom || !isDrawing) return;

		// Get the context and redraw from the offscreen canvas
		const ctx = canvases.dom.getContext('2d');
		if (!ctx) throw new Error('Canvas context is null');
		if (!canvases.offscreen) return;

		ctx.clearRect(0, 0, canvases.dom.width, canvases.dom.height);
		ctx.drawImage(canvases.offscreen, 0, 0, canvases.dom.width, canvases.dom.height);

		// Draw the selection rectangle
		ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.rect(
			Math.min(drawStart.x, drawCurrent.x),
			Math.min(drawStart.y, drawCurrent.y),
			Math.abs(drawCurrent.x - drawStart.x),
			Math.abs(drawCurrent.y - drawStart.y)
		);
		ctx.stroke();
	};
</script>

{#if ready.faceapi}
	<form onsubmit={submitHandler} class="mb-24">
		<!-- mb-24 is needed to ensure the dock doesn't cover the submit button -->
		{#if ready.preview !== 'ready'}
			<label for="picture" class="cursor-pointer p-4">
				<div class="grid w-full items-center gap-1.5">
					<div class="bg-primary-content text-primary p-4 shadow">
						<div
							class="border-primary flex aspect-square w-full flex-col items-center justify-center gap-5 border-8 border-dashed"
						>
							<div class={(ready.preview === 'working' && 'animate-spin') || ''}>
								{#if ready.preview === 'working'}
									<LoadingSpinner class="h-[25dvw] w-[25dvw]" />
								{:else}
									<ImagePlus class="h-[25dvw] w-[25dvw]" />
								{/if}
							</div>
						</div>
					</div>
					<input
						id="picture"
						type="file"
						onchange={handleFileSelect}
						accept="image/*"
						class="hidden"
					/>
				</div>
			</label>
		{/if}

		<div style="width: 100%; aspect-ratio: auto;">
			<canvas
				bind:this={canvases.dom}
				class={ready.preview === 'ready' ? 'shadow-md' : ''}
				style="width: 100%; height: {ready.preview === 'ready' ? 'auto' : 0}; touch-action: none;"
				onmousedown={startDrawing}
				onmousemove={continueDrawing}
				onmouseup={stopDrawing}
				onmouseleave={stopDrawing}
				ontouchstart={startDrawing}
				ontouchmove={continueDrawing}
				ontouchend={stopDrawing}
			></canvas>
		</div>

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
							onclick={() => {
								faceList.splice(i, 1);
								blurFaces(canvases, faceList);
							}}
						>
							Don't blur
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<button class="btn btn-primary mt-4" type="submit">Submit</button>
	</form>
{/if}

<!-- Cropper Modal -->
<dialog class="modal w-full" bind:this={cropperModal}>
	<div class="modal-box flex h-[100dvh] w-full max-w-full flex-col items-center p-0">
		<div class="relative h-full w-5/6 flex-1">
			<Cropper
				bind:this={cropInstance}
				image={originalFile ? URL.createObjectURL(originalFile) : undefined}
				aspect={imageAspect}
				oncropcomplete={(e) => (croppedAreaPixels = e.pixels)}
			/>
		</div>
		<div class="flex gap-2 py-4">
			<button class="btn btn-primary" onclick={handleCropComplete}> Crop </button>
			<button
				class="btn btn-error"
				onclick={() => {
					originalFile = undefined;
					cropperModal?.close();
				}}
			>
				Cancel
			</button>
		</div>
	</div>
</dialog>
