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

{#if photos && photos.length}
	<div class="columns-2 gap-2 md:columns-3">
		{#each photos as photo, i (photo?.value?.id || i)}
			{#if photo?.value?.id}
				<div class="isolate mb-2 break-inside-avoid">
					<a href="/image/{photo.value.id}" class="rounded-box block overflow-hidden">
						<Image id={photo.value.id} containerStyles="w-full" />
					</a>
				</div>
			{/if}
		{/each}
	</div>
{:else}
	<div class="col-span-2 p-4 md:col-span-2">{emptyHint}</div>
{/if}
