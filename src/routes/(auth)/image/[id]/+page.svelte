<script lang="ts">
	import { page } from '$app/state';
	import RenderImage from '$lib/components/RenderImage.svelte';
	import { Photo } from '$lib/schema';
	import { useAccount, useCoState } from 'jazz-svelte';
	import { Group, type ID } from 'jazz-tools';
	const photoId = $derived(page.params.id) as ID<Photo> | undefined;
	const photo = $derived(useCoState(Photo, photoId, {}));
	const meta = $derived(photo.current?._edits.image);
	const photoProp = $derived({
		...meta,
		value: photo.current
	});
	const { me } = $derived(
		useAccount({
			resolve: {
				root: {
					myCommunities: true
				}
			}
		})
	);
	const publishedInCommunities = $derived(
		photo.current?._owner
			?.getParentGroups()
			.map((parentGroup) =>
				me?.root.myCommunities?.find((community) => community?._owner.id === parentGroup.id)
			)
	);
</script>

<RenderImage photo={photoProp} />
<div class="flex gap-1 p-2">
	{#if publishedInCommunities}
		Published in
		{#each publishedInCommunities as community}<span class="badge badge-sm badge-primary"
				>{community?.name}</span
			>{/each}
	{/if}
</div>
