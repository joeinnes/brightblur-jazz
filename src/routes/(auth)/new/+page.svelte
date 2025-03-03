<script lang="ts">
	import { onMount } from 'svelte';
	import { Group, FileStream, type ID, Account } from 'jazz-tools';
	import * as faceapi from 'face-api.js';
	import { Photo, FaceSlice, ListOfFaceSlices, GlobalData, Person } from '$lib/schema';
	import { useCoState } from 'jazz-svelte';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import { imageDataToFile } from '$lib/utils/imageData';
	import ImagePlus from 'lucide-svelte/icons/image-plus';
	import Autocomplete from '$lib/components/Autocomplete.svelte';

	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			people: [],
			photos: []
		})
	);

	let listOfPeople = $derived.by(() => {
		const allPeople = [];
		if (globalData?.current?.people) {
			for (const [_, entries] of Object.entries(globalData?.current?.people)) {
				for (const entry of entries.all) {
					allPeople.push(entry);
				}
			}
		}

		return allPeople;
	});

	let canvases: {
		dom: HTMLCanvasElement | null;
		original: HTMLCanvasElement | null;
		offscreen: HTMLCanvasElement | null;
	} = $state({
		dom: null, // This canvas is the canvas on which the image is displayed to the user
		original: null, // This canvas holds the original full image
		offscreen: null // This canvas holds a full size version of the DOM canvas
	});

	let faceList: {
		x: number;
		y: number;
		width: number;
		height: number;
		originalImageData: ImageData;
		person: ID<Person> | null;
	}[] = $state([]);

	let ready: {
		img: boolean;
		faceapi: boolean;
		preview: 'working' | 'ready' | 'no image';
	} = $state({
		img: false,
		faceapi: false,
		preview: 'no image'
	});
	const renderPreview = async (e: Event & { currentTarget: HTMLInputElement }) => {
		ready.preview = 'working';
		const input = e.currentTarget;
		if (!input.files || !input.files[0]) return; // TODO: Throw an error here
		const img = await faceapi.bufferToImage(input.files[0]);
		const displaySize = { width: img.width, height: img.height };
		canvases.original = document.createElement('canvas');
		canvases.original.width = displaySize.width;
		canvases.original.height = displaySize.height;
		const originalCtx = canvases.original.getContext('2d');
		if (!originalCtx) return; // TODO: throw an error here
		originalCtx.drawImage(img, 0, 0, displaySize.width, displaySize.height);

		if (canvases.dom) {
			canvases.dom.width = displaySize.width;
			canvases.dom.height = displaySize.height;
			const domCtx = canvases.dom.getContext('2d');
			if (!domCtx) return; // TODO: throw an error here
			domCtx.drawImage(img, 0, 0, displaySize.width, displaySize.height);
		}

		const detections = await faceapi.detectAllFaces(
			img,
			new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.4 })
		);

		faceList = [];
		detections.forEach((detection) => {
			const { x, y, width, height } = detection.box;
			const faceData = getFaceData(x, y, width, height);
			if (!faceData) return;
			faceList = [...faceList, faceData];
		});
		blurFaces();
	};

	const submitHandler = async (e: Event) => {
		if (!canvases.offscreen) return;
		const file: Blob = await new Promise((resolve) =>
			canvases.offscreen?.toBlob((blob) => {
				if (!blob) throw new Error();
				resolve(blob);
			}, 'image/jpeg')
		);

		if (!file) return;
		try {
			const publicGroup = Group.create();
			publicGroup.addMember('everyone', 'reader');
			const listOfFaceSlices = ListOfFaceSlices.create([], publicGroup);
			for (let i = 0; i < faceList.length; i++) {
				const face = faceList[i];
				if (!face.person) return;
				const person = listOfPeople?.find((person) => person.value.id === face.person);
				if (!person) return;
				const parentGroup = person.value._owner.castAs(Group) as Group;
				const childGroup = Group.create();
				// TODO: Once I can work out how to remove the 'everyone' member and extend the group, I can use group extension here
				parentGroup.members.forEach(async (member) => {
					if (member.id !== 'everyone') {
						const userToAdd = await Account.load(member.id, []);
						if (userToAdd) {
							childGroup.addMember(userToAdd, member.role);
						}
					} else {
						console.log('everyone', member);
					}
				});

				const file = await imageDataToFile(face.originalImageData);
				const fileStream = await FileStream.createFromBlob(file, { owner: childGroup });

				const faceSlice = FaceSlice.create(
					{
						...face,
						file: fileStream,
						person: person
					},
					{ owner: childGroup }
				);
				listOfFaceSlices.push(faceSlice);
			}

			const image = await FileStream.createFromBlob(file, {
				owner: publicGroup
			});
			const photo = Photo.create(
				{
					file: image,
					faceSlices: listOfFaceSlices,
					width: canvases.original.width,
					height: canvases.original.height
				},
				{
					owner: publicGroup
				}
			);
			globalData.current?.photos.push(photo);
			console.log('Added photo to stream');
		} catch (e) {
			console.error(e);
		}
	};

	function getFaceData(x: number, y: number, width: number, height: number) {
		if (!canvases.original) return; // TODO: Throw error here
		const ctx = canvases.original.getContext('2d');
		if (!ctx) return;
		const blurX = Math.max(x, 0);
		const blurY = Math.max(y, 0);
		const blurWidth = Math.min(width, canvases.original.width - blurX);
		const blurHeight = Math.min(height, canvases.original.height - blurY);

		return {
			x: blurX,
			y: blurY,
			width: blurWidth,
			height: blurHeight,
			originalImageData: ctx.getImageData(blurX, blurY, blurWidth, blurHeight),
			person: null
		};
	}

	const blurFaces = async () => {
		if (!canvases.original || !canvases.dom) return; // TODO: Throw error here
		const ctx = canvases.dom.getContext('2d');
		if (!ctx) return; // TODO: Throw error here
		if (!canvases.offscreen) {
			canvases.offscreen = document.createElement('canvas');
			canvases.offscreen.width = canvases.original.width;
			canvases.offscreen.height = canvases.original.height;
		}
		const offscreenCtx = canvases.offscreen.getContext('2d', { willReadFrequently: true });
		if (!offscreenCtx) return;
		offscreenCtx.drawImage(
			canvases.original,
			0,
			0,
			canvases.offscreen.width,
			canvases.offscreen.height
		);

		faceList.forEach((faceData) => {
			const { x, y, width, height } = faceData;
			const smallCanvas = document.createElement('canvas');
			const smallCtx = smallCanvas.getContext('2d');
			if (!smallCtx) return;
			const smallWidth = 6;
			const smallHeight = Math.ceil(6 * (width / height));
			smallCanvas.width = smallWidth;
			smallCanvas.height = smallHeight;
			// Draw the face onto the small canvas
			if (!canvases.offscreen) return;
			smallCtx.drawImage(canvases.offscreen, x, y, width, height, 0, 0, smallWidth, smallHeight);
			offscreenCtx.imageSmoothingEnabled = false;
			offscreenCtx.drawImage(smallCanvas, 0, 0, smallWidth, smallHeight, x, y, width, height);
			offscreenCtx.imageSmoothingEnabled = true;
		});

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
		ready.preview = 'ready';
	};

	onMount(() => {
		faceapi.nets.tinyFaceDetector
			.loadFromUri('/models')
			.then(() => (ready.faceapi = true))
			.catch((e) => console.error(e));
	}); // Load the FaceAPI models when the component is mounted

	$inspect(listOfPeople);
</script>

{#if ready.faceapi}
	<form onsubmit={submitHandler}>
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

		{#if ready.preview}
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
									bind:selectedItem={faceList[i].person}
									imageData={face.originalImageData}
									{listOfPeople}
									people={globalData.current?.people}
									items={listOfPeople.map((person) => {
										return {
											value: person.value.id,
											label: person.value.name
										};
									})}
									placeholder="Who is this?"
								/>
							{/if}
						</div>
						<button
							type="button"
							class="btn btn-neutral"
							onclick={() => {
								faceList.splice(i, 1);
								blurFaces();
							}}
						>
							Don't blur
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<button class="btn btn-primary mt-4" type="submit">Submit</button>
	</form>{/if}
