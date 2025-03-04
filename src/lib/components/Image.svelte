<script lang="ts">
	import { Photo } from '$lib/schema';
	import { useCoState } from 'jazz-svelte';
	import { FileStream, type ID } from 'jazz-tools';
	const {
		id,
		containerStyles = ''
	}: {
		id: ID<Photo>;
		containerStyles?: string;
	} = $props();
	const photo = $derived(
		useCoState(Photo, id, {
			file: [],
			faceSlices: [{ file: [] }]
		})
	);

	let canvas: HTMLCanvasElement | undefined = $state();
	const ctx = $derived(canvas?.getContext('2d'));

	const getFile = async (id: ID<FileStream>) => {
		if (!id) return;
		try {
			const blob = await FileStream.loadAsBlob(id);
			if (!blob) return;
			return createImageBitmap(blob);
		} catch (e) {
			console.log({ e });
		}
	};

	let naturalDimensions = $state({ w: 0, h: 0 });

	async function renderCanvas() {
		if (!canvas || !ctx || !photo?.current?.file?.id) return;

		const mainImage = await getFile(photo?.current?.file.id);
		if (!mainImage) return;

		naturalDimensions.w = mainImage.width;
		naturalDimensions.h = mainImage.height;
		canvas.width = mainImage.width;
		canvas.height = mainImage.height;

		// Clear any previous content and ensure clean rendering
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(mainImage, 0, 0);

		const primaryColour = getComputedStyle(document.documentElement)
			.getPropertyValue('--color-primary')
			.trim();

		if (photo.current.faceSlices) {
			// First pass: draw all borders
			for (const slice of photo.current.faceSlices) {
				if (!slice?.x || !slice?.y || !slice?.width || !slice?.height) continue;
				ctx.strokeStyle = primaryColour;
				const lineWidth = Math.floor(Math.max(slice.width / 24, 2));
				ctx.lineWidth = lineWidth;

				// Adjust border position to be fully under the face image
				const x = Math.floor(slice.x);
				const y = Math.floor(slice.y);
				const width = Math.ceil(slice.width);
				const height = Math.ceil(slice.height);
				const radius = Math.floor(slice.width / 24);

				ctx.beginPath();
				ctx.roundRect(
					x + lineWidth / 2,
					y + lineWidth / 2,
					width - lineWidth,
					height - lineWidth,
					radius
				);
				ctx.stroke();
			}

			// Second pass: overlay face images
			for (const slice of photo.current.faceSlices) {
				if (!slice?.x || !slice?.y || !slice?.width || !slice?.height || !slice?.file?.id) continue;
				try {
					const faceImage = await getFile(slice.file.id);
					if (faceImage) {
						ctx.drawImage(
							faceImage,
							Math.floor(slice.x),
							Math.floor(slice.y),
							Math.ceil(slice.width),
							Math.ceil(slice.height)
						);
					}
				} catch (e) {
					console.log(e);
					// NOOP: this is expected behaviour if a user has no rights to view a slice
				}
			}
		}
	}
	$effect(() => {
		if (photo?.current) {
			renderCanvas();
		}
	});
</script>

{#if id}
	<div class="{containerStyles} flex items-center justify-center">
		<canvas
			bind:this={canvas}
			class="h-auto max-w-full object-contain object-center shadow-md"
			style="display: block;"
		></canvas>
	</div>
{/if}
