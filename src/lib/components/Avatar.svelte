<script lang="ts">
	import type { BrightBlurProfile } from '$lib/schema';
	import { getUserHue } from '$lib/utils/userUtils';
	import { FileStream, type ID } from 'jazz-tools';

	const {
		id,
		name = '',
		userId,
		style = 'size-10'
	}: {
		id: ID<FileStream> | undefined;
		name?: string;
		userId: ID<BrightBlurProfile> | undefined;
		style?: `size-${number}`;
	} = $props();

	const sizeValue = $derived(parseInt(style.split('-')[1]) || 10);
	const fontSize = $derived(`${sizeValue * 0.1}rem`);
</script>

{#if id}
	{#await FileStream.loadAsBlob(id) then blob}
		{#if blob}
			{@const url = URL.createObjectURL(blob)}
			<img
				src={url}
				onload={() => URL.revokeObjectURL(url)}
				alt="Profile"
				class="border-primary {style} rounded-full border-2 object-cover"
			/>
		{/if}
	{/await}
{:else}
	{@const hue = getUserHue(userId)}
	<div
		class="border-primary text-secondary-content {style} avatar avatar-placeholder flex items-center justify-center rounded-full border-2"
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
