<script lang="ts">
	import type { Photo } from '$lib/schema';

	import Image from './Image.svelte';

	import type { CoFeedEntry } from 'jazz-tools/dist/coValues/coFeed.js';

	let {
		photos,
		emptyHint = 'Nothing to see here'
	}: {
		photos?: CoFeedEntry<Photo>[];
		emptyHint?: string;
	} = $props();
</script>

<div class="grid grid-cols-2 gap-2 md:grid-cols-3">
	{#if photos && photos.length}
		{#each photos as photo, i (photo?.value?.id || i)}
			{#if photo?.value?.id}
				<a href="/image/{photo.value.id}"
					><Image id={photo.value.id} containerStyles="aspect-square overflow-hidden" /></a
				>
			{/if}
		{/each}
	{:else}
		<div class="col-span-3">{emptyHint}</div>
	{/if}
</div>
