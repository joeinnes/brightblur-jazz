<script lang="ts">
	import { onMount } from 'svelte';
	import { Group, FileStream, type ID, Account } from 'jazz-tools';
	import { Photo, FaceSlice, ListOfFaceSlices, GlobalData } from '$lib/schema';
	import { useCoState } from 'jazz-svelte';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import { imageDataToFile } from '$lib/utils/imageData';
	import ImagePlus from 'lucide-svelte/icons/image-plus';
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

	// Process uploaded image and detect faces
	const renderPreview = async (e: Event & { currentTarget: HTMLInputElement }) => {
		ready.preview = 'working';
		const input = e.currentTarget;
		if (!input.files || !input.files[0]) {
			ready.preview = 'no image';
			return;
		}

		try {
			const { faceList: detectedFaces } = await processImageForFaces(input.files[0], canvases);
			faceList = detectedFaces;
			blurFaces(canvases, faceList);
			ready.preview = 'ready';
		} catch (error) {
			console.error('Error processing image:', error);
			ready.preview = 'no image';
		}
	};

	// Handle form submission
	const submitHandler = async (e: Event) => {
		e.preventDefault();
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
			goto('/');
		} catch (e) {
			console.error('Error submitting photo:', e);
		}
	};

	// Initialize face detection on component mount
	onMount(async () => {
		ready.faceapi = await initFaceDetection();
	});
</script>

{#if ready.faceapi}
	<form onsubmit={submitHandler} class="mb-24">
		<!-- mb-24 is needed to ensure the dock doesn't cover the submit button -->
		{#if ready.preview !== 'ready'}
			<label for="picture" class="cursor-pointer p-4">
				<div class="grid w-full items-center gap-1.5">
					<div
						class="bg-primary-content text-primary rounded-box p-4 shadow-md {ready.preview ===
							'working' && 'animate-pulse'}"
					>
						<div
							class="border-primary flex aspect-square w-full flex-col items-center justify-center gap-5 rounded border-8 border-dashed"
						>
							<ImagePlus class="h-[25dvw] w-[25dvw]" />
						</div>
					</div>
					<input
						id="picture"
						type="file"
						onchange={renderPreview}
						accept="image/*"
						class="hidden"
					/>
				</div>
			</label>
		{/if}

		<div style="width: 100%; aspect-ratio: auto;">
			<canvas
				bind:this={canvases.dom}
				class="rounded-box shadow-md"
				style="width: 100%; height: {ready.preview === 'ready' ? 'auto' : 0}; touch-action: none;"
			></canvas>
		</div>

		{#if ready.preview === 'ready'}
			<small class="text-muted-foreground">Draw on the picture to add an area to blur</small>

			<ul class="list bg-base-100 rounded-box shadow-md">
				{#each faceList as face, i}
					{@const imgSize = 'size-20'}
					<li class="list-row items-center">
						<div class="select-none">
							{#await imageDataToFile(face.originalImageData)}
								<img class="{imgSize} rounded-box skeleton" alt="loading..." />
							{:then imageFile}
								<img
									class="{imgSize} rounded-box"
									src={URL.createObjectURL(imageFile)}
									alt="Face {i + 1}"
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
