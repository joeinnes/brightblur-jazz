<script lang="ts">
	import type { BrightBlurProfile, Community } from '$lib/schema';
	import { useProgressiveImg } from '$lib/utils/imageData.svelte';
	import { getUserHue } from '$lib/utils/userUtils';
	import { ImageDefinition, type ID } from 'jazz-tools';

	const {
		image,
		name = '',
		userId,
		style = 'size-10'
	}: {
		image: ImageDefinition | null | undefined;
		name?: string;
		userId: ID<BrightBlurProfile> | ID<Community> | undefined;
		style?: `size-${number}`;
	} = $props();

	const sizeValue = $derived(parseInt(style.split('-')[1]) || 10);
	const fontSize = $derived(`${sizeValue * 0.1}rem`);
	let width = $state(16);
	const { src } = $derived(useProgressiveImg({ image, targetWidth: width || 16 }));
</script>

<div bind:clientWidth={width}>
	{#if image}
		<img {src} alt="Profile" class="border-primary {style} rounded-full border-0 object-cover" />
	{:else}
		{@const hue = getUserHue(userId)}
		<div
			class="border-primary text-secondary-content {style} avatar avatar-placeholder flex items-center justify-center rounded-full border-0"
			style={`font-size: ${fontSize}; background-color: oklch(49.8% 0.0763 ${hue}); color: oklch(90% 0.21 ${hue});`}
		>
			<div class="flex h-full w-full items-center justify-center text-center leading-none">
				{name
					.split(' ')
					.map((el: string) => el[0])
					.join('')}
			</div>
		</div>
	{/if}
</div>
