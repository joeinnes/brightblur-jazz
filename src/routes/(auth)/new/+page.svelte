<script lang="ts">
	import { onMount } from 'svelte';
	import { Group, FileStream, type ID, Account } from 'jazz-tools';
	import { Photo, FaceSlice, ListOfFaceSlices, GlobalData, Image, ListOfImages } from '$lib/schema';
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
		type FaceData
	} from '$lib/utils/faceDetection';
	import { extractAllPeople } from '$lib/utils/profileUtils';
	import Cropper from 'svelte-easy-crop';
	import { cropImage, type CroppedAreaPixels } from '$lib/utils/cropUtils';
	import toast from '@natoune/svelte-daisyui-toast';
	import Pica from 'pica';

	// Get global data for people and photos
	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			people: [],
			photos: []
		})
	);

	// Extract list of people from global data
	let listOfPeople = $derived(extractAllPeople(globalData));

	let cropInstance: Cropper | undefined = $state();
	// Canvas state management
	let canvases: {
		dom: HTMLCanvasElement | undefined;
		original: HTMLCanvasElement | undefined;
		offscreen: OffscreenCanvas | undefined;
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

	// Cropping state
	let cropperModal: HTMLDialogElement | undefined = $state();
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
		try {
			const input = e.currentTarget;
			if (!input.files || !input.files[0]) throw new Error('No file selected.');

			originalFile = input.files[0];

			// Calculate aspect ratio from the original image
			const img = document.createElement('img');
			const url = URL.createObjectURL(input.files[0]);

			img.onload = () => {
				imageAspect = img.width / img.height;
				URL.revokeObjectURL(url);
				cropperModal?.showModal();
			};

			img.onerror = () => {
				URL.revokeObjectURL(url);
				imageAspect = undefined;
				cropperModal?.show();
			};

			img.src = url;
		} catch (e: unknown) {
			if (e instanceof Error) {
				toast.error(e.message, { duration: 3000 });
			}
		}
	};

	// Process cropped image and detect faces
	const processCroppedImage = async (croppedBlob: Blob) => {
		ready.preview = 'working';

		try {
			// Convert blob to file
			const croppedFile = new File([croppedBlob], originalFile?.name || 'cropped-image.jpg', {
				type: 'image/jpeg'
			});

			if (canvases.offscreen === null) throw new Error('Something went wrong.');
			const { faceList: detectedFaces } = await processImageForFaces(croppedFile, canvases);
			faceList = detectedFaces;
			blurFaces(canvases, faceList);
			ready.preview = 'ready';
		} catch (error: unknown) {
			console.error('Error processing image:', error);
			if (error instanceof Error) {
				toast.error(error.message, { duration: 3000 });
			}
			ready.preview = 'no image';
		}
	};

	// Handle crop completion
	const handleCropComplete = async () => {
		try {
			if (!originalFile) throw new Error('Something went wrong.');
			const croppedBlob = await cropImage(originalFile, croppedAreaPixels);
			cropperModal?.close();
			await processCroppedImage(croppedBlob);
		} catch (e: unknown) {
			console.error('Error cropping image:', e);
			if (e instanceof Error) toast.error(e.message, { duration: 3000 });
			ready.preview = 'no image';
		}
	};

	// Handle form submission
	const submitHandler = async (e: Event) => {
		e.preventDefault();

		try {
			if (!canvases.offscreen || !canvases.original) throw new Error('Something went wrong.');

			// Create public group for photo access
			const publicGroup = Group.create();
			publicGroup.addMember('everyone', 'reader');

			// Define the target sizes we want to generate
			const targetSizes = [320, 1024, 2048, 4096];

			// Generate multiple sizes for the main photo
			const photoImages = await generateResizedImages(canvases.original, targetSizes, publicGroup);

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
				for (const member of parentGroup.members) {
					const userToAdd = await Account.load(member.id, []);
					if (userToAdd) {
						fileGroup.addMember(userToAdd, member.role);
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
						person: profile.value,
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

			// Add photo to global data
			globalData.current?.photos.push(photo);
			toast.success('Photo uploaded successfully!', {
				duration: 3000
			});
			goto('/');
		} catch (e: unknown) {
			console.error('Error submitting photo:', e);
			if (e instanceof Error) {
				toast.error(e.message, { duration: 3000 });
			}
		}
	};

	// Function to generate multiple image sizes
	// Add proper type for generateResizedImages function
	async function generateResizedImages(
		sourceCanvas: HTMLCanvasElement,
		targetSizes: number[],
		ownerGroup: Group
	): Promise<ListOfImages> {
		const images = ListOfImages.create([], ownerGroup);
		const originalWidth = sourceCanvas.width;
		const originalHeight = sourceCanvas.height;

		// Add the original image
		const originalBlob: Blob = await new Promise((resolve, reject) => {
			sourceCanvas.toBlob(
				(blob) => {
					if (blob instanceof Blob) {
						resolve(blob);
					} else {
						reject(new Error('Failed to create original blob'));
					}
				},
				'image/jpeg',
				0.9
			);
		});

		const originalFile = await FileStream.createFromBlob(originalBlob, {
			owner: ownerGroup
		});

		const originalImage = Image.create(
			{
				size: originalWidth,
				file: originalFile
			},
			{ owner: ownerGroup }
		);

		images.push(originalImage);

		// Generate each target size that's smaller than the original
		const pica = new Pica({
			tile: 1024,
			features: ['all']
		}) as any; // Add type assertion until proper types are available

		for (const size of targetSizes.filter((size) => size < originalWidth)) {
			const resizedCanvas = document.createElement('canvas');
			resizedCanvas.width = size;
			resizedCanvas.height = Math.round(size * (originalHeight / originalWidth));

			await pica.resize(sourceCanvas, resizedCanvas, {
				filter: 'lanczos2'
			});

			const resizedBlob: Blob = await new Promise((resolve, reject) => {
				resizedCanvas.toBlob(
					(blob) => {
						if (blob instanceof Blob) {
							resolve(blob);
						} else {
							reject(new Error(`Failed to create ${size}px blob`));
						}
					},
					'image/jpeg',
					0.9
				);
			});

			const resizedFile = await FileStream.createFromBlob(resizedBlob, {
				owner: ownerGroup
			});

			const resizedImage = Image.create(
				{
					size: size,
					file: resizedFile
				},
				{ owner: ownerGroup }
			);

			images.push(resizedImage);
		}

		return images;
	}

	// Initialize face detection on component mount
	onMount(async () => {
		ready.faceapi = await initFaceDetection();
	});

	// Add drawing state
	let isDrawing = $state(false);
	let drawStart = $state({ x: 0, y: 0 });
	let drawCurrent = $state({ x: 0, y: 0 });

	// Function to handle drawing on canvas
	const startDrawing = (e: MouseEvent | TouchEvent) => {
		try {
			if (!canvases.dom) throw new Error('Something went wrong.');

			isDrawing = true;
			const rect = canvases.dom.getBoundingClientRect();
			const x = (e instanceof MouseEvent ? e.clientX : e.touches[0].clientX) - rect.left;
			const y = (e instanceof MouseEvent ? e.clientY : e.touches[0].clientY) - rect.top;

			drawStart = { x, y };
			drawCurrent = { x, y };
		} catch (e: unknown) {
			console.error(e);
			if (e instanceof Error) {
				toast.error(e.message, { duration: 3000 });
			}
		}
	};

	const continueDrawing = (e: MouseEvent | TouchEvent) => {
		if (!isDrawing || !canvases.dom) return null;

		const rect = canvases.dom.getBoundingClientRect();
		const x = (e instanceof MouseEvent ? e.clientX : e.touches[0].clientX) - rect.left;
		const y = (e instanceof MouseEvent ? e.clientY : e.touches[0].clientY) - rect.top;

		drawCurrent = { x, y };

		// Redraw the canvas with the current selection rectangle
		redrawCanvas();
	};

	// Fix type in stopDrawing function
	const stopDrawing = () => {
		if (!isDrawing || !canvases.dom || !canvases.original) return null;

		isDrawing = false;

		// Calculate the rectangle in original image coordinates as decimal values (0-1)
		const x = Math.min(drawStart.x, drawCurrent.x) / canvases.dom.clientWidth;
		const y = Math.min(drawStart.y, drawCurrent.y) / canvases.dom.clientHeight;
		const width = Math.abs(drawCurrent.x - drawStart.x) / canvases.dom.clientWidth;
		const height = Math.abs(drawCurrent.y - drawStart.y) / canvases.dom.clientHeight;

		// Only create a face slice if the area is large enough
		if (width * canvases.original.width > 20 && height * canvases.original.height > 20) {
			// Create a new face slice from the drawn area
			const ctx = canvases.original.getContext('2d');
			if (!ctx) throw new Error('Canvas context is null');

			// Convert decimal coordinates back to pixel values for getting image data
			const pixelX = Math.floor(x * canvases.original.width);
			const pixelY = Math.floor(y * canvases.original.height);
			const pixelWidth = Math.ceil(width * canvases.original.width);
			const pixelHeight = Math.ceil(height * canvases.original.height);

			const imageData = ctx.getImageData(pixelX, pixelY, pixelWidth, pixelHeight);

			// Create a new face data object with decimal coordinates
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
		try {
			if (!canvases.dom || !isDrawing) throw new Error('Something went wrong.');

			// Get the context and redraw from the offscreen canvas
			const ctx = canvases.dom.getContext('2d');
			if (!ctx) throw new Error('Something went wrong.');
			if (!canvases.offscreen) throw new Error('Something went wrong.');

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
		} catch (e: unknown) {
			if (e instanceof Error) toast.error('Something went wrong.', { duration: 3000 });
		}
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
	<div class="modal-box flex flex-col items-center">
		<!-- flex h-[100dvh] w-full max-w-full flex-col items-center rounded-none p-0">-->
		<div class="relative w-full flex-1" style="aspect-ratio: {imageAspect}">
			<Cropper
				bind:this={cropInstance}
				image={originalFile ? URL.createObjectURL(originalFile) : undefined}
				aspect={imageAspect}
				oncropcomplete={(e) => (croppedAreaPixels = e.pixels)}
			/>
		</div>
		<div class="flex gap-2 bg-transparent py-4">
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
