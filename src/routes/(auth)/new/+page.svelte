<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Group, type ID, Account } from 'jazz-tools';
	import { useCoState } from 'jazz-svelte';
	import { createImage } from 'jazz-browser-media-images';
	import * as faceapi from 'face-api.js';
	import toast from '@natoune/svelte-daisyui-toast';

	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';

	import { Photo, FaceSlice, ListOfFaceSlices, GlobalData } from '$lib/schema';
	import { imageDataToFile } from '$lib/utils/imageData.svelte';
	import { processImageForFaces, type FaceData } from '$lib/utils/faceDetection';
	import { extractAllPeople } from '$lib/utils/profileUtils';
	import { blobToCanvas, drawFaceRectangles, renderBlurredCanvas } from '$lib/utils/canvasUtils';

	import Autocomplete from '$lib/components/Autocomplete.svelte';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import PreviewCanvas from '$lib/components/PreviewCanvas.svelte';
	import pica from 'pica';

	// Get global data for people and photos
	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			resolve: {
				people: true,
				photos: true
			}
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
	let ready: {
		img: boolean;
		faceapi: boolean;
		preview: 'no image' | 'working' | 'ready';
	} = $state({
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
			const offscreenCanvas = document.createElement('canvas');
			offscreenCanvas.width = canvas.width;
			offscreenCanvas.height = canvas.height;
			await renderBlurredCanvas(canvas, offscreenCanvas, faceList);

			const publicGroup = Group.create();
			publicGroup.addMember('everyone', 'reader');
			const picaInstance = new pica();
			const blob = await picaInstance.toBlob(offscreenCanvas, 'image/jpeg', 1);
			const photoImage = await createImage(blob, { owner: publicGroup });
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
						const userToAdd = await Account.load(member.id);
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

				const blob = await picaInstance.toBlob(faceCanvas, 'image/jpeg', 1);
				// Generate multiple sizes for the face slice
				const faceImage = await createImage(blob, { owner: fileGroup });

				// Create face slice with the new images array
				const faceSlice = FaceSlice.create(
					{
						x: face.x,
						y: face.y,
						width: face.width,
						height: face.height,
						person: profile?.value || null,
						image: faceImage
					},
					{ owner: sliceGroup }
				);

				listOfFaceSlices.push(faceSlice);
			}

			// Create the photo with all the generated images
			const photo = Photo.create(
				{
					image: photoImage,
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
</script>

{#if ready.faceapi}
	<form onsubmit={submitHandler} class="mb-24">
		<!-- mb-24 is needed to ensure the dock doesn't cover the submit button -->
		{#if ready.preview !== 'ready'}
			<ImageUpload readyState={ready.preview} bind:croppedBlob />
		{/if}

		<PreviewCanvas
			bind:canvas={canvases.dom}
			bind:faceList
			originalCanvas={canvases.original}
			readyState={ready.preview}
		/>

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
