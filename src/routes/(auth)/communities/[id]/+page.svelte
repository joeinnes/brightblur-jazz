<script lang="ts">
	import { useAccount, useCoState } from 'jazz-svelte';
	import { Group, type ID } from 'jazz-tools';
	import { page } from '$app/state';
	import { BrightBlurProfile, Community, GlobalData } from '$lib/schema';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';

	// Import utility functions
	import { extractSortedPhotos } from '$lib/utils/profileUtils';
	import PhotoGallery from '$lib/components/PhotoGallery.svelte';
	import type { CoFeedEntry } from 'jazz-tools/dist/coValues/coFeed.js';
	import CommunityHeader from '$lib/components/CommunityHeader.svelte';
	import CommunityAccessManager from '$lib/components/CommunityAccessManager.svelte';
	import NavBar from '$lib/components/NavBar.svelte';
	import type { Photo } from '$lib/schema';
	import MingcuteGrid2Line from '../../../../icons/MingcuteGrid2Line.svelte';
	import MingcuteUserLockLine from '../../../../icons/MingcuteUserLockLine.svelte';

	const { me } = $derived(
		useAccount({
			resolve: {
				root: {
					myCommunities: true
				}
			}
		})
	);

	// Get profile ID from URL parameter, handle 'me' special case
	const communityId = $derived(page.params.id) as ID<Community>;

	const community = $derived(useCoState(Community, communityId, {}));

	// Check if current user can administer the viewed profile
	const canAdminCommunity = $derived(
		communityId && community.current && me?.canAdmin(community.current)
	);

	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			resolve: { photos: true, people: true }
		})
	);
	const photoArray = $derived(extractSortedPhotos(globalData?.current?.photos || undefined));

	/**
	 * Filters photos that were shared with a specific community
	 */
	function filterPhotosByCommunity(
		photoArray: CoFeedEntry<Photo>[],
		communityId: ID<Community> | undefined
	): CoFeedEntry<Photo>[] {
		if (!communityId || !photoArray.length) return [];

		return photoArray.filter((photo) => {
			// Check if the photo exists and has an owner
			if (!photo?.value?._owner) return false;

			// Get parent groups of the photo's owner group
			const parentGroups = photo.value._owner.getParentGroups();

			// Check if any of the parent groups match the community's owner group ID
			return parentGroups.some((group) => group.id === community.current?._owner.id);
		});
	}

	// Filter photos for this community
	const communityPhotos = $derived(filterPhotosByCommunity(photoArray, communityId));

	let communityNameModal: HTMLDialogElement | undefined = $state();
	let prevName = $state('');
</script>

<NavBar>
	{#if canAdminCommunity && community.current?.name !== undefined}
		<button
			class="btn btn-ghost justify-start px-2 text-lg font-bold"
			onclick={() => {
				prevName = community.current?.name || '';
				communityNameModal?.showModal();
			}}
		>
			{community.current?.name}
		</button>
	{:else}<h3 class="text-lg font-bold">{community.current?.name}</h3>{/if}
</NavBar>
<dialog class="modal" bind:this={communityNameModal}>
	<div class="modal-box">
		<h3 class="mb-2 text-lg font-bold">Community name</h3>
		{#if community.current?.name}
			<input type="text" class="input join-item" bind:value={community.current.name} />
			<div class="modal-action">
				<form method="dialog">
					<!-- if there is a button in form, it will close the modal -->
					<button
						class="btn"
						onclick={() => {
							// @ts-ignore checked on line 94
							community.current.name = prevName;
						}}>Cancel</button
					>
					<button class="btn btn-primary">Save</button>
				</form>
			</div>
		{/if}
	</div>
</dialog>
<main class="container mx-auto max-w-xl flex-1 px-4">
	{#if community.current}
		<CommunityHeader {community} {canAdminCommunity} />
		<div class="tabs tabs-box mt-4 justify-around">
			<!-- Photo Gallery Tab -->
			<label class="tab">
				<MingcuteGrid2Line size={2} />
				<input type="radio" name="community_tabs" checked={true} />
			</label>
			<div class="tab-content">
				<PhotoGallery
					photos={communityPhotos}
					emptyHint="No photos have been shared with this community yet."
				/>
			</div>

			<!-- Members Tab -->
			<label class="tab">
				<MingcuteUserLockLine size={2} />
				<input type="radio" name="community_tabs" />
			</label>
			<CommunityAccessManager {community} admin={canAdminCommunity || false} />
		</div>
	{/if}
</main>

<style lang="postcss">
	@reference "tailwindcss";
	.tab {
		@apply mb-2;
	}
</style>
