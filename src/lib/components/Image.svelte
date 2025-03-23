<script lang="ts">
	import type { ID } from 'jazz-tools';
	import { useCoState } from 'jazz-svelte';
	import { Photo } from '$lib/schema';

	import { renderCanvas, useProgressiveImg } from '$lib/utils/imageData.svelte';

	import LoaderPinwheel from 'lucide-svelte/icons/loader-pinwheel';

	const {
		id,
		containerStyles = 'w-full',
		shouldLoad = true
	}: {
		id: ID<Photo>;
		containerStyles?: string;
		shouldLoad?: boolean;
	} = $props();
	const photo = $derived(
		useCoState(Photo, id, {
			image: {},
			faceSlices: [{ image: {} }]
		})
	);

	let canvas: HTMLCanvasElement | undefined = $state();
	let loading = $state(true);

	let naturalDimensions = $state({ w: 0, h: 0 });
	let container: HTMLDivElement | undefined = $state();
	const { src } = $derived(useProgressiveImg({ image: photo.current?.image, maxWidth: 1024 }));

	$effect(() => {
		if (container && shouldLoad && photo.current) {
			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting && canvas && photo.current && src) {
							renderCanvas(canvas, src, photo.current.faceSlices, naturalDimensions)
								.then(() => {
									loading = false;
									observer.unobserve(entry.target);
								})
								.catch((e) => {
									console.error('Render failed:', e);
									loading = false;
									observer.unobserve(entry.target);
								});
						}
					});
				},
				{
					root: null,
					rootMargin: '100px',
					threshold: 0.1
				}
			);

			observer.observe(container);

			return () => {
				observer.disconnect();
			};
		}
	});
</script>

{#if id}
	<div
		class="{containerStyles} flex items-center justify-center {loading && 'h-full w-full'}"
		bind:this={container}
	>
		{#if container?.clientWidth}
			<canvas
				bind:this={canvas}
				class="object-cover shadow-md"
				width={container?.clientWidth}
				style="display: {loading ? 'none' : 'block'}"
			></canvas>
		{/if}
		{#if loading}
			<img {src} class="w-full animate-pulse blur-lg" alt="Placeholder" />
		{/if}
	</div>
{/if}
