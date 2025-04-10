<script lang="ts">
	import { type ID } from 'jazz-tools';
	import { useCoState } from 'jazz-svelte';

	import Plus from 'lucide-svelte/icons/plus';

	import Footer from '$lib/components/Footer.svelte';
	import NavBar from '$lib/components/NavBar.svelte';

	import { FeedOfPhotos, GlobalData } from '$lib/schema';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import RenderImage from '$lib/components/RenderImage.svelte';
	import { extractSortedPhotos } from '$lib/utils/profileUtils';

	let globalData = $derived(useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>));
	let photoFeed = $derived(useCoState(FeedOfPhotos, globalData?.current?.photos?.id || undefined));

	const photoArray = $derived(extractSortedPhotos(photoFeed?.current || undefined));
</script>

<!-- <button class="btn btn-primary mb-4" onclick={async () => {}}> Fixes </button>-->
<NavBar />

<main class="container mx-auto mb-24 max-w-xl flex-1 px-4">
	<a
		href="/new"
		class="btn btn-primary btn-soft btn-block btn-xl text-base-content hover:text-base-100 mb-4 h-auto justify-start gap-4 rounded-2xl p-4 px-4 transition-colors"
		><i class="bg-primary text-primary-content rounded-full p-2"><Plus size="1.2em" /></i>Upload
		photo</a
	>
	<div class="grid gap-4">
		{#each photoArray as photo, i (photo?.value?.id || i)}
			<a href="/image/{photo?.value?.id}">
				<RenderImage {photo} />
			</a>
		{:else}
			<div class="p-4">
				<p class="pb-2">It's a bit quiet round here.</p>
				<a href="/new" class="btn btn-primary">Get the party started?</a>
			</div>
		{/each}
	</div>
</main>
<Footer />
