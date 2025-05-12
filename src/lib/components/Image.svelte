<script lang="ts">
	import type { ID } from 'jazz-tools';
	import { useAccount, useCoState } from 'jazz-svelte';
	import { Photo } from '$lib/schema';
	import { intersect } from 'svelte-intersection-observer-action';
	import { useProgressiveImg } from '$lib/utils/imageData.svelte';
	import { untrack } from 'svelte';

	let container = $state<HTMLDivElement>();
	const {
		id,
		containerStyles = 'w-full'
	}: {
		id: ID<Photo>;
		containerStyles?: string;
	} = $props();

	// Use untrack to prevent unnecessary re-renders when props change
	const photoId = untrack(() => id);

	const photo = $derived(useCoState(Photo, photoId));
	const { me } = $derived(useAccount());

	// Use untrack to prevent cascading updates
	let canvas: HTMLCanvasElement | undefined = $state();
	let ready = $state(false);
	let width: number = $state(16);
	let shouldRender = $state(false);
	let aspectRatio = $state('3/4');

	// Only update when shouldRender or width changes
	const { res, src } = $derived(
		shouldRender
			? useProgressiveImg({
					image: photo.current?.image,
					targetWidth: shouldRender ? width : 16
				})
			: { res: 'placeholder', src: '' }
	);

	function preloadList() {
		if (!photo.current?.faceSlices) return;
		// Note: This is ugly, but I don't like the fact that Jazz errors to the console here. As `.ensureLoaded` is async, this potentially means other errors will be suppressed while the loading is happening. This is not a good solution, and perhaps this should be configurable in Jazz directly.
		const originalConsoleError = console.error;
		console.error = () => {};
		photo?.current?.faceSlices
			.ensureLoaded({
				resolve: {
					$each: {
						image: { $each: true }
					}
				}
			})
			.catch((e) => null)
			.finally(() => (console.error = originalConsoleError)); // This is expected if the user does not have access to the faceSlice.

		return true;
	}

	const fsMap = $derived(
		shouldRender
			? preloadList() &&
					photo.current?.faceSlices?.map((fs) => {
						if (!fs?.image || !me?.canRead(fs.image))
							return { ...fs, src: undefined, res: undefined };
						let src = '';
						let res = '';
						const bestRes = fs.image.highestResAvailable({
							targetWidth: canvas?.width || 16 * fs.width
						});
						if (bestRes) {
							const blob = bestRes.stream.toBlob();
							if (blob) {
								src = URL.createObjectURL(blob);
								res = bestRes.res;
								setTimeout(() => {
									URL.revokeObjectURL(src);
								}, 10000); // Catch memory leaks
							}
						}

						return {
							...fs,
							src,
							res
						};
					})
			: []
	);

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
		use:intersect={{
			callback: (entry) => {
				if (!shouldRender && entry.isIntersecting) {
					shouldRender = true;
				}
			},
			root: null,
			rootMargin: '200px',
			threshold: 0.1
		}}
	>
		{#if shouldRender}
			<img
				{src}
				alt="Background"
				class="absolute -z-10 w-full"
				class:blur-lg={res === 'placeholder'}
				class:animate-pulse={res === 'placeholder'}
				onload={handleImageLoad}
				loading="lazy"
			/>
			{#each fsMap || [] as fs}
				{#if fs?.src}
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
						<img
							src={fs.src}
							alt="Face"
							loading="lazy"
							class="h-full w-full object-cover"
							onload={() => URL.revokeObjectURL(fs.src)}
						/>
					</div>
				{/if}
			{/each}
		{/if}
	</div>
{:else}
	<div class="bg-base-300 aspect-[3/4] w-full animate-pulse"></div>
{/if}
