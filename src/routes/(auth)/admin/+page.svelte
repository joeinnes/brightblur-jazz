<script lang="ts">
	import { goto } from '$app/navigation';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import NavBar from '$lib/components/NavBar.svelte';
	import { FeedOfPhotos, GlobalData } from '$lib/schema';
	import { useAccount, useCoState } from 'jazz-svelte';
	import type { ID } from 'jazz-tools';
	import MingcutePhotoAlbum2Line from '../../../icons/MingcutePhotoAlbum2Line.svelte';
	import MingcuteGroup2Line from '../../../icons/MingcuteGroup2Line.svelte';
	import { extractAllPeople, extractSortedPhotos } from '$lib/utils/profileUtils';

	let { me } = $derived(useAccount());
	let globalData = $derived(useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>));
	let photoFeed = $derived(useCoState(FeedOfPhotos, globalData?.current?.photos?.id || undefined));

	let photoArray = $derived(extractSortedPhotos(photoFeed?.current || undefined));
	let listOfPeople = $derived(extractAllPeople(globalData));
</script>

<NavBar><h3 class="text-lg font-bold">Admin</h3></NavBar>
<main class="container mx-auto max-w-xl flex-1 px-4">
	{#if globalData && globalData.current && me && me?.canAdmin(globalData.current)}
		You are an instance admin

		<div class="tabs tabs-box mt-4 justify-center">
			<!-- Photo Gallery - Uploads Tab -->
			<label class="tab"
				><MingcutePhotoAlbum2Line size={2} />
				<input type="radio" name="profile_tabs" checked={true} />
			</label>
			<div class="tab-content">
				<ul class="mt-2">
					{#each photoArray as photo}
						<li>{photo?.value?.id}</li>
					{/each}
				</ul>
			</div>
			<label class="tab"
				><MingcuteGroup2Line size={2} /> <input type="radio" name="profile_tabs" />
			</label>
			<div class="tab-content">
				<ul>
					{#each listOfPeople as person}
						<li><strong>{person?.value?.name}</strong><br /><small>{person?.value?.id}</small></li>
					{/each}
				</ul>
			</div>
		</div>
	{:else}
		You are not an instance admin
	{/if}
</main>
