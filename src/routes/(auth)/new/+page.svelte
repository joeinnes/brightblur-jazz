<script lang="ts">
	import { goto } from '$app/navigation';
	import { Group, type ID, Account, Profile } from 'jazz-tools';
	import { useCoState, useAccount } from 'jazz-svelte';
	import { createImage } from 'jazz-browser-media-images';
	import toast from '@natoune/svelte-daisyui-toast';
	import { Tween } from 'svelte/motion';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';

	import {
		Photo,
		FaceSlice,
		ListOfFaceSlices,
		GlobalData,
		Community,
		BrightBlurProfile
	} from '$lib/schema';
	import { imageDataToFile } from '$lib/utils/imageData.svelte';
	import { processImageForFaces, type FaceData } from '$lib/utils/faceDetection';
	import { extractAllPeople } from '$lib/utils/profileUtils';
	import { blobToCanvas, drawFaceRectangles, renderBlurredCanvas } from '$lib/utils/canvasUtils';

	import Autocomplete from '$lib/components/Autocomplete.svelte';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import PreviewCanvas from '$lib/components/PreviewCanvas.svelte';
	import pica from 'pica';
	import NavBar from '$lib/components/NavBar.svelte';
	import MingcuteCloseCircleLine from '../../../icons/MingcuteCloseCircleLine.svelte';
	import MingcuteDownLine from '../../../icons/MingcuteDownLine.svelte';
	import MingcuteCheckLine from '../../../icons/MingcuteCheckLine.svelte';
	import { FaceMatcher, LabeledFaceDescriptors } from 'face-api.js';

	let { me } = $derived(
		useAccount({
			resolve: {
				root: {
					myCommunities: true,
					myRecognisedFaces: {
						$each: true
					}
				}
			}
		})
	);
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
	let canvases = $state({
		dom: undefined as HTMLCanvasElement | undefined, // Canvas displayed to the user
		original: undefined as HTMLCanvasElement | undefined, // Holds the original full image
		offscreen: undefined as HTMLCanvasElement | undefined // Holds a full size version of the DOM canvas
	});

	let isOpen = $state(false);
	// Face detection results
	let faceList = $state<FaceData[]>([]);
	let selectedCommunities = $state<Array<Community | null>>([]);
	// Component state
	let ready = $state({
		img: false,
		faceapi: false,
		preview: 'no image' as 'no image' | 'working' | 'ready'
	});

	let croppedBlob = $state<Blob | undefined>();

	let originalCanvas = $derived(blobToCanvas(croppedBlob));
	let submitting = $state(false);

	// Update the face list when the cropped blob changes
	$effect(() => {
		const run = async () => {
			if (!croppedBlob) {
				ready.preview = 'no image';
				canvases.original = undefined;
				faceList = [];
				return;
			}
			try {
				const canvas = await originalCanvas;
				ready.preview = 'working';
				canvases.original = canvas;
				const detectedFaces = await processImageForFaces(canvas);
				if (labelledDescriptors.length) {
					const faceMatcher = new FaceMatcher(labelledDescriptors, 0.6);
					for (let i = 0; i < detectedFaces.length; i++) {
						if (detectedFaces[i].descriptor) {
							const bestMatch = faceMatcher.findBestMatch(
								new Float32Array(detectedFaces[i].descriptor || [])
							);
							if (bestMatch.label === 'unknown') continue;
							const person = await BrightBlurProfile.load(bestMatch.label as ID<BrightBlurProfile>);
							detectedFaces[i].person = person || null;
						}
					}
				}
				faceList = detectedFaces;
				if (!canvases.dom) return;
				await renderBlurredCanvas(canvas, canvases.dom, faceList);
				drawFaceRectangles(canvases.dom, faceList);
				ready.preview = 'ready';
			} catch (error: unknown) {
				console.error('Error processing image:', error);
				if (error instanceof Error) {
					toast.error(error.message, { duration: 3000 });
				}
				ready.preview = 'no image';
			}
		};
		run();
	});

	// Handle form submission
	const submitHandler = async (e: Event) => {
		submitting = true;
		e.preventDefault();
		try {
			const canvas = await originalCanvas;
			if (!canvas) throw new Error('Something went wrong.');
			const offscreenCanvas = document.createElement('canvas');
			offscreenCanvas.width = canvas.width;
			offscreenCanvas.height = canvas.height;
			await renderBlurredCanvas(canvas, offscreenCanvas, faceList);

			const photoGroup = Group.create();
			if (selectedCommunities.length === 0) {
				photoGroup.addMember('everyone', 'reader');
			} else {
				for (const community of selectedCommunities) {
					if (community) photoGroup.extend(community._owner.castAs(Group), 'reader');
				}
			}
			const picaInstance = new pica();
			const blob = await picaInstance.toBlob(offscreenCanvas, 'image/jpeg', 1);
			const photoImage = await createImage(blob, {
				owner: photoGroup
			});
			// Create list of face slices
			const listOfFaceSlices = ListOfFaceSlices.create([], photoGroup);
			// Process each detected face
			for (const face of faceList) {
				if (!face.person) continue;
				const profile = listOfPeople?.find((profile) => profile.value.id === face.person?.id);
				// Setup access groups
				const fileGroup = Group.create();
				const sliceGroup = Group.create();
				if (selectedCommunities.length === 0) {
					sliceGroup.addMember('everyone', 'reader');
				} else {
					for (const community of selectedCommunities) {
						if (community) sliceGroup.extend(community._owner.castAs(Group), 'reader');
					}
				}
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
				const faceImage = await createImage(blob, {
					owner: fileGroup
				});

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
				if (!me || !me.root.myRecognisedFaces || !face.descriptor || !profile) continue;
				const existingDescriptors = me?.root?.myRecognisedFaces[profile.value]?.descriptors || [];

				me.root.myRecognisedFaces[profile.value.id as string] = {
					descriptors: [...existingDescriptors, face.descriptor]
				};
			}

			// Create the photo with all the generated images
			const photo = Photo.create(
				{
					image: photoImage,
					faceSlices: listOfFaceSlices
				},
				{
					owner: photoGroup
				}
			);

			// Add photo to global data (feed)
			globalData.current?.photos.push(photo);
			success = true;
		} catch (e: unknown) {
			console.error('Error submitting photo:', e);
			if (e instanceof Error) {
				toast.error(e.message, { duration: 3000 });
			}
		} finally {
			submitting = false;
		}
	};

	// Initialize face detection on component mount
	$effect(() => {
		const loadModels = async () => {
			const faceapi = await import('face-api.js');
			try {
				await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
				await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
				await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
				ready.faceapi = true;
			} catch {
				ready.faceapi = false;
			}
		};
		loadModels();
		// No cleanup needed, this effect runs once on mount
	});

	let success = $state(false);
	let progressToNavigate = new Tween(0, {
		duration: 5000
	});
	$effect(() => {
		if (success) {
			progressToNavigate.set(360).then(() => {
				setTimeout(() => goto('/'), 200);
			});
		}
	});
	let labelledDescriptors = $derived(
		Object.entries(me?.root?.myRecognisedFaces || {}).map(([key, value]) => {
			return new LabeledFaceDescriptors(
				key,
				value.descriptors.map((val) => new Float32Array(val))
			);
		})
	);
</script>

<NavBar><h3 class="text-lg font-bold">New Photo</h3></NavBar>

<main class="container mx-auto max-w-xl flex-1 px-4">
	{#if success}
		<div class="flex-1 pt-20">
			<div class="flex flex-col items-center justify-center text-center">
				<div
					class="relative mb-8 rounded-full p-4 text-center"
					style="background-image: conic-gradient(var(--color-success) {progressToNavigate.current}deg, var(--color-base-200) {progressToNavigate.current}deg);"
				>
					<div class="rounded-full bg-white">
						<div
							class="bg-success/50 text-base-100 mx-auto flex flex-col items-center justify-center rounded-full p-4 text-center"
						>
							<MingcuteCheckLine class="size-[40vw]" />
						</div>
					</div>
				</div>
				<div class="max-w-md">
					<h1 class="text-4xl font-bold">Photo shared!</h1>
					<p class="py-6 text-xl">Only people with approval will see unblurred faces</p>
					<a href="/" class="btn btn-primary btn-xl">Done</a>
				</div>
			</div>
		</div>
	{:else}
		<form onsubmit={submitHandler} class="container mx-auto max-w-xl flex-1 px-4" id="form">
			{#if ready.faceapi}
				<div class:hidden={ready.preview === 'ready'}>
					<ImageUpload bind:readyState={ready.preview} bind:croppedBlob />
				</div>
				<div class:hidden={ready.preview !== 'ready'} class="overflow-hidden rounded-2xl">
					<PreviewCanvas
						bind:canvas={canvases.dom}
						bind:faceList
						originalCanvas={canvases.original}
						bind:readyState={ready.preview}
					/>
				</div>

				<div>
					{#if ready.preview === 'ready'}
						<small class="opacity-60">Draw on the picture to add an area to blur</small>

						<h3 class="text-lg font-semibold">Faces detected</h3>
						<ul class="list p-0">
							{#each faceList as face, i}
								{@const imgSize = 'size-20'}
								<li class="list-row items-center px-0 py-2 first-of-type:pt-0">
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
									<div class="join">
										{#if listOfPeople && listOfPeople.length > 0}
											<Autocomplete
												selectedPerson={faceList[i].person}
												updateSelectedPerson={(person) => {
													faceList[i].person = person;
												}}
												imageData={face.originalImageData}
												placeholder="Who is this?"
											/>
										{/if}

										<button
											type="button"
											class="btn join-item"
											onclick={async () => {
												if (!canvases.original || !canvases.dom) return null;
												// Use slice to create a new array to trigger reactivity
												const updatedFaceList = faceList.slice();
												updatedFaceList.splice(i, 1);
												faceList = updatedFaceList;
												await renderBlurredCanvas(canvases.original, canvases.dom, faceList);
												drawFaceRectangles(canvases.dom, faceList);
											}}
										>
											<MingcuteCloseCircleLine size={2} />
										</button>
									</div>
								</li>
							{:else}<li class="list-row">
									No faces detected. You can draw faces on the picture to add them.
								</li>
							{/each}
						</ul>

						<div>
							<h3 class="text-lg font-semibold">Communities</h3>
							<details bind:open={isOpen}>
								<summary class="input bg-base-200 m-1 w-full"
									>{#each selectedCommunities as selected}<button
											class="badge badge-primary cursor-pointer"
											onclick={(e) => {
												e.preventDefault();
												// Use filter to create a new array to trigger reactivity
												selectedCommunities = selectedCommunities.filter(
													(selectedCommunity) => selectedCommunity !== selected
												);
											}}
										>
											{selected?.name} <MingcuteCloseCircleLine class="size-4" /></button
										>{:else}<span class="badge badge-primary">Public</span>{/each}<MingcuteDownLine
										class="ms-auto size-4 transform transition-transform {isOpen
											? 'rotate-180'
											: ''}"
									/></summary
								>
								<ul class="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
									<li>
										<!-- I know about the warnings. I want to use a label element to control the input to increase the click target size. I probably want to fix this in future to do something a bit more accessible. -->
										<!-- svelte-ignore a11y_click_events_have_key_events -->
										<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
										<label
											onclick={(e) => {
												e.preventDefault();
												if (selectedCommunities && selectedCommunities.length === 0) return;
												selectedCommunities = [];
											}}
											><input
												type="checkbox"
												class="checkbox checkbox-xs"
												checked={!selectedCommunities || selectedCommunities?.length === 0
													? true
													: false}
											/>Public</label
										>
									</li>
									{#each me?.root?.myCommunities || [] as communityPromise}
										{#if communityPromise}
											{#await communityPromise}
												<li>Loading...</li>
											{:then community}
												{#if community}
													<li>
														<label
															><input
																type="checkbox"
																class="checkbox checkbox-xs"
																bind:group={selectedCommunities}
																value={community}
															/>{community.name}</label
														>
													</li>
												{/if}
											{/await}
										{/if}
									{/each}
								</ul>
							</details>
						</div>
						<p class="text-sm opacity-60">
							Select the communities you want to share this photo with. This doesn't affect which
							faces are blurred.
						</p>
					{/if}
				</div>
			{/if}
		</form>
		<div class="p-4">
			<button
				class="btn btn-primary btn-block"
				type="submit"
				disabled={submitting || ready.preview !== 'ready'}
				form="form">Share</button
			>
		</div>
	{/if}
</main>
