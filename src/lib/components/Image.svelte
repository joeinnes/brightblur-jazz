<script lang="ts">
	import type { ID } from 'jazz-tools';
	import { useCoState } from 'jazz-svelte';
	import { Photo } from '$lib/schema';

	import { renderCanvas, useProgressiveImg } from '$lib/utils/imageData.svelte';
	import { onMount } from 'svelte';

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
			resolve: {
				image: {
					$each: true
				},
				faceSlices: {
					$each: {
						image: { $each: true }
					}
				}
			}
		})
	);

	let faceSlices = $derived(photo.current?.faceSlices);
	let canvas: HTMLCanvasElement | undefined = $state();
	let loading = $state(true);
	let width: number | undefined = $state();
	let shouldRender = $state(false);

	let container: HTMLDivElement | undefined = $state();
	const { src, res } = $derived(
		useProgressiveImg({ image: photo.current?.image, targetWidth: width || 1024 })
	);

	$effect(() => {
		console.log(container, shouldLoad, photo.current);
		if (container && shouldLoad && photo.current) {
			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting && src) {
							console.log('intersecting');
							shouldRender = true;
							observer.unobserve(entry.target);
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
	const renderCanvasAction = (node: HTMLCanvasElement, src: string) => {
		if (!src) return;
		width = node.width;
		renderCanvas(node, src, faceSlices)
			.then(() => {
				loading = false;
			})
			.catch((e) => {
				console.error('Render failed:', e);
				loading = false;
			});
	};
</script>

{#if id}
	<div
		class="{containerStyles} flex items-center justify-center {loading && 'h-full w-full'}"
		bind:this={container}
	>
		{#if src && shouldRender}
			<canvas
				bind:this={canvas}
				class="object-cover shadow-md"
				class:hidden={res === 'placeholder' || loading}
				width={container?.clientWidth}
				use:renderCanvasAction={src}
			></canvas>
			<img {src} class="w-full animate-pulse blur-lg" class:hidden={!loading} alt="Placeholder" />
		{:else}
			<div class="bg-base-300 aspect-[3/4] w-full animate-pulse"></div>
		{/if}
	</div>
{:else}
	<div class="bg-base-300 aspect-[3/4] w-full animate-pulse"></div>
{/if}
