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
	const { res, src } = $derived(
		useProgressiveImg({
			image: photo.current?.image,
			targetWidth: shouldRender ? width : 16
		})
	);

	const fsMap = $derived(
		photo.current?.faceSlices?.map((fs) => {
			if (!fs.image) return { ...fs, src: undefined, res: undefined };
			let src = '';
			let res = '';
			const bestRes = fs.image.highestResAvailable({ targetWidth: canvas?.width || 16 * fs.width });
			if (bestRes) {
				const blob = bestRes.stream.toBlob();
				if (blob) {
					src = URL.createObjectURL(blob);
					res = bestRes.res;
				}
			}

			return {
				...fs,
				src,
				res
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
		if (res !== 'placeholder') {
			ready = true;
		}
	};
</script>

{#if id && photo?.current?.id}
	<div
		class="{containerStyles} relative flex items-center justify-center"
		style="aspect-ratio: {aspectRatio}"
		bind:this={container}
		bind:clientWidth={width}
		use:intersect={options}
	>
		<img
			{src}
			alt="Background"
			class="absolute -z-10 w-full"
			class:blur-lg={res === 'placeholder'}
			onload={handleImageLoad}
		/>
		{#each fsMap || [] as fs}
			<div
				class="border-primary absolute z-0 transition-opacity duration-200 {ready
					? 'opacity-100'
					: 'opacity-0'} rounded"
				class:border-primary={!fs?.src || res === 'placeholder' || fs?.res === 'placeholder'}
				class:border-2={!fs?.src || fs?.res === 'placeholder' || res === 'placeholder'}
				style="
					top: calc({100 * fs.y}% - 0.5px); 
					left: calc({100 * fs.x}% - 0.5px); 
					width: calc({100 * fs.width}% + 1px); 
					height: calc({100 * fs.height}% + 1px);"
			>
				{#if fs?.src}
					<img
						src={fs.src}
						alt="Face"
						class="h-full w-full object-cover"
						onload={() => URL.revokeObjectURL(fs.src)}
					/>
				{/if}
			</div>
		{/each}
	</div>
{:else}
	<div class="bg-base-300 aspect-[3/4] w-full animate-pulse"></div>
{/if}
