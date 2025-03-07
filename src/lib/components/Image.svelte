<script lang="ts">
	import type { ID } from 'jazz-tools';
	import { useCoState } from 'jazz-svelte';
	import { Photo } from '$lib/schema';

	import { renderCanvas } from '$lib/utils/imageData';

	import LoaderPinwheel from 'lucide-svelte/icons/loader-pinwheel';

	const {
		id,
		containerStyles = '',
		shouldLoad = true
	}: {
		id: ID<Photo>;
		containerStyles?: string;
		shouldLoad?: boolean;
	} = $props();
	const photo = $derived(
		useCoState(Photo, id, {
			file: [],
			faceSlices: [{ file: [] }]
		})
	);

	let canvas: HTMLCanvasElement | undefined = $state();
	let loading = $state(true);

	let naturalDimensions = $state({ w: 0, h: 0 });
	let container: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (container && shouldLoad && photo.current) {
			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting && canvas && photo.current) {
							renderCanvas(canvas, photo.current, naturalDimensions)
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
		class="{containerStyles} flex items-center justify-center {loading && 'h-full'}"
		bind:this={container}
	>
		<canvas
			bind:this={canvas}
			class="h-auto w-full object-contain object-center shadow-md"
			style="display: {loading ? 'none' : 'block'};"
		></canvas>
		{#if loading}
			<div
				class="bg-primary-content text-primary grid aspect-square w-full animate-pulse place-items-center"
			>
				<div class="w-1/2 animate-spin">
					<LoaderPinwheel class="size-full" />
				</div>
			</div>
		{/if}
	</div>
{/if}
