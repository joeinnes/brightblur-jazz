<script lang="ts">
	import { page } from '$app/state';
	import RenderImage from '$lib/components/RenderImage.svelte';
	import { Photo } from '$lib/schema';
	import { useAccount, useCoState } from 'jazz-svelte';
	import { type ID } from 'jazz-tools';
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
	import { getUserHue } from '$lib/utils/userUtils';
	import NavBar from '$lib/components/NavBar.svelte';
	import MingcuteUser3Line from '../../../../icons/MingcuteUser3Line.svelte';
</script>

<NavBar><h3 class="text-lg font-bold">View Photo</h3></NavBar>

<main class="container mx-auto max-w-xl flex-1 px-4">
	<RenderImage photo={photoProp} />

	<div class="flex gap-1 py-2">
		{#each photo?.current?.faceSlices?.sorted || [] as slice}
			{#if slice?.person?.name}
				{@const hue = getUserHue(slice.person.id)}
				<a href="/profile/{slice.person.id}">
					<div
						class="badge border-0"
						style="background-color: oklch(0.87 0.2064 {hue}); color: oklch(5% 0.21 {hue});"
					>
						<MingcuteUser3Line size={1} class="mr-0.5" />{slice.person.name}
					</div>
				</a>
			{/if}
		{/each}
	</div>

	<div class="flex gap-1 p-2">
		{#if publishedInCommunities && publishedInCommunities.length > 0}
			Published in
			{#each publishedInCommunities as community}<span class="badge badge-sm badge-primary"
					>{community?.name}</span
				>{/each}
		{/if}
	</div>
</main>
