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
	import User from 'lucide-svelte/icons/user';
	import { getUserHue } from '$lib/utils/userUtils';
	let sortedFaceSlices = $derived(
		photo?.current?.faceSlices?.toSorted((a, b) => {
			if (!a?.person?.name) return 1;
			if (!b?.person?.name) return -1;
			return a?.person?.name.localeCompare(b?.person?.name || '');
		}) || []
	);
</script>

<div class="navbar bg-base-100 sticky top-0 z-50 mb-2 px-4">
	<div class="navbar-start">
		<button
			class="btn btn-circle btn-ghost flex items-center text-2xl font-bold"
			onclick={() => {
				window.history.back();
				window.scrollTo(0, 0);
			}}>&larr;</button
		>
	</div>
	<div class="navbar-center"><h3 class="text-lg font-bold">View Photo</h3></div>
	<div class="navbar-end"></div>
</div>
<main class="container mx-auto mb-24 max-w-xl flex-1 px-4">
	<RenderImage photo={photoProp} />

	<div class="flex gap-1 px-2">
		{#each sortedFaceSlices as slice}
			{#if slice?.person?.name}
				{@const hue = getUserHue(slice.person.id)}
				<a href="/profile/{slice.person.id}">
					<div
						class="badge badge-sm border-0"
						style="background-color: oklch(49.8% 0.0763 {hue}); color: oklch(90% 0.21 {hue});"
					>
						<User class="mr-0.5 w-[1em]" />{slice.person.name}
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
