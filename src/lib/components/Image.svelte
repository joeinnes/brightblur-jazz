<script lang="ts">
	import type { ID } from 'jazz-tools';
	import { useCoState } from 'jazz-svelte';
	import { Photo } from '$lib/schema';
	import { intersect } from 'svelte-intersection-observer-action';
	import { renderCanvas, useProgressiveImg } from '$lib/utils/imageData.svelte';
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

	// Only update when shouldRender or width changes
	const { src } = $derived(
		useProgressiveImg({
			image: photo.current?.image,
			targetWidth: shouldRender ? width : 16
		})
	);

	const fsMap = $derived(
		photo.current?.faceSlices?.map((fs) => {
			let src = '';
			const bestRes = fs.image.highestResAvailable({ targetWidth: canvas?.width || 16 * fs.width });
			if (bestRes) {
				const blob = bestRes.stream.toBlob();
				if (blob) {
					src = URL.createObjectURL(blob);

					// Remember to revoke the URL when no longer needed
					setTimeout(() => URL.revokeObjectURL(src), 200);
				}
			}

			return {
				...fs,
				src
			};
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

	const handleImageLoad = (event: Event) => {
		const img = event.target as HTMLImageElement;
		if (img?.naturalWidth && img?.naturalHeight) {
			aspectRatio = `${img.naturalWidth}/${img.naturalHeight}`;
		}
	};
</script>

{#if id && photo?.current?.id}
	<div
		class="{containerStyles} relative flex w-full items-center justify-center"
		style="aspect-ratio: {aspectRatio}"
		bind:this={container}
		bind:clientWidth={width}
		use:intersect={options}
	>
		<img {src} alt="Background" class="absolute z-10 w-full" onload={handleImageLoad} />
		{#each fsMap || [] as fs}
			<div
				class="border-primary absolute z-20 rounded"
				class:border-primary={!fs.src}
				class:border-2={!fs.src}
				style="
					top: {Math.round(100 * fs.y * 100) / 100}%; 
					left: {Math.round(100 * fs.x * 100) / 100}%; 
					width: {Math.round(100 * fs.width * 100) / 100}%; 
					height: {Math.round(100 * fs.height * 100) / 100}%;"
			>
				<img src={fs.src} alt="Face" class="h-full w-full object-cover" />
			</div>
		{/each}
		<!--
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
		{/if}-->
	</div>
{:else}
	<div class="bg-base-300 aspect-[3/4] w-full animate-pulse"></div>
{/if}
