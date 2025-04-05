<script lang="ts">
	import type { ID } from 'jazz-tools';
	import { useCoState } from 'jazz-svelte';
	import { Photo } from '$lib/schema';
	import { intersect } from 'svelte-intersection-observer-action';
	import { renderCanvas, useProgressiveImg } from '$lib/utils/imageData.svelte';
	import { fade } from 'svelte/transition';
	import { untrack } from 'svelte';

	const {
		id,
		containerStyles = 'w-full',
		shouldLoad = true
	}: {
		id: ID<Photo>;
		containerStyles?: string;
		shouldLoad?: boolean;
	} = $props();

	// Use untrack to prevent unnecessary re-renders when props change
	const photoId = untrack(() => id);

	const photo = $derived(
		useCoState(Photo, photoId, {
			resolve: {
				image: true,
				faceSlices: {
					$each: {
						image: {
							$each: true
						}
					}
				}
			}
		})
	);

	// Use untrack to prevent cascading updates
	let faceSlices = $derived(untrack(() => photo.current?.faceSlices));
	let canvas: HTMLCanvasElement | undefined = $state();
	let loading = $state(true);
	let ready = $state(false);
	let width: number = $state(16);
	let shouldRender = $state(false);
	let aspectRatio = $state('3/4');

	let container: HTMLDivElement | undefined = $state();

	// Memoize placeholder to prevent recalculation
	const { src: placeholder } = $derived(
		useProgressiveImg({ image: untrack(() => photo.current?.image), targetWidth: 16 })
	);

	// Only update when shouldRender or width changes
	const { src, res } = $derived(
		useProgressiveImg({
			image: untrack(() => photo.current?.image),
			targetWidth: shouldRender ? width : 16
		})
	);

	const options = {
		callback: () => {
			if (!shouldRender && shouldLoad) {
				shouldRender = true;
			}
		},
		root: null,
		rootMargin: '200px',
		threshold: 0.1
	};

	// Optimize this derived value
	let currentImageWidth = $derived(res ? parseInt(res.split('x')[0], 10) : undefined);

	// Optimize effect to run only when necessary
	$effect(() => {
		if (
			!canvas ||
			!src ||
			!currentImageWidth ||
			isNaN(currentImageWidth) ||
			currentImageWidth <= width ||
			!shouldRender
		) {
			return;
		}

		// Avoid logging in production
		// console.log('rendering', res);

		renderCanvas(canvas, src, faceSlices)
			.then(() => {
				loading = false;
				ready = true;
			})
			.catch((e) => {});
	});

	const handleImageLoad = (event: Event) => {
		const img = event.target as HTMLImageElement;
		if (img?.naturalWidth && img?.naturalHeight) {
			aspectRatio = `${img.naturalWidth}/${img.naturalHeight}`;
		}
	};
</script>

{#if id && photo?.current?.id}
	<div
		class="{containerStyles} flex w-full items-center justify-center"
		style="aspect-ratio: {aspectRatio}"
		bind:this={container}
		bind:clientWidth={width}
		use:intersect={options}
	>
		{#if res && src && shouldRender}
			<canvas
				bind:this={canvas}
				class="absolute -z-20 w-full object-cover shadow-md"
				{width}
				style="aspect-ratio: {aspectRatio}"
			></canvas>
			{#if !ready}
				<img
					src={placeholder}
					onload={handleImageLoad}
					class="absolute -z-10 w-full animate-pulse blur-lg"
					out:fade
					style="aspect-ratio: {aspectRatio}"
					alt="Placeholder"
				/>
			{/if}
		{:else}
			<div class="bg-base-300 aspect-[3/4] w-full animate-pulse"></div>
		{/if}
	</div>
{:else}
	<div class="bg-base-300 aspect-[3/4] w-full animate-pulse"></div>
{/if}
