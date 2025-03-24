<script lang="ts">
	import { type CoFeedEntry, type ID } from 'jazz-tools';
	import { FeedOfPhotos, GlobalData, Photo } from '$lib/schema';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import RenderImage from '$lib/components/RenderImage.svelte';
	import { extractSortedPhotos } from '$lib/utils/profileUtils';
	import { useCoState } from 'jazz-svelte';
	let globalData = $derived(useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>));
	let photoFeed = $derived(useCoState(FeedOfPhotos, globalData?.current?.photos?.id || undefined));

	const photoArray = $derived(extractSortedPhotos(photoFeed?.current || undefined));
</script>

<!-- <button class="btn btn-primary mb-4" onclick={async () => {}}> Fixes </button>-->

<div class="grid gap-4">
	{#each photoArray as photo, i (photo?.value?.id || i)}
		<RenderImage {photo} />
	{:else}
		<div class="p-4">
			<p class="pb-2">It's a bit quiet round here.</p>
			<a href="/new" class="btn btn-primary">Get the party started?</a>
		</div>
	{/each}
</div>
