<script lang="ts">
	import { type ID } from 'jazz-tools';
	import { useCoState } from 'jazz-svelte';
	import { GlobalData } from '$lib/schema';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import RenderImage from '$lib/components/RenderImage.svelte';
	import { extractSortedPhotos } from '$lib/utils/profileUtils';
	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			people: [],
			photos: []
		})
	);
	const photoArray: any[] = $derived(extractSortedPhotos(globalData));
</script>

{#if photoArray}
	<div class="grid gap-4">
		{#each photoArray as photo, i (photo?.value?.id || i)}
			<RenderImage {photo} />
		{:else}
			<div>
				<p class="pb-2">It's a bit quiet round here.</p>
				<a href="/new" class="btn btn-primary">Get the party started?</a>
			</div>
		{/each}
	</div>
{/if}
