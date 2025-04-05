<script lang="ts">
	import { useAccount, useCoState } from 'jazz-svelte';
	import { type ID } from 'jazz-tools';
	import { page } from '$app/state';
	import { BrightBlurProfile, Photo, Community, BrightBlurAccount, GlobalData } from '$lib/schema';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';

	// Import components
	import ProfileHeader from '$lib/components/ProfileHeader.svelte';
	import ProfileAccessManager from '$lib/components/ProfileAccessManager.svelte';
	import ManagedUsersList from '$lib/components/ManagedUsersList.svelte';

	// Import utility functions
	import {
		extractAllPeople,
		filterManagedPeople,
		extractSortedPhotos,
		filterPhotosByUploader,
		filterPhotosOfPerson
	} from '$lib/utils/profileUtils';
	import ProfilePhotoGallery from '$lib/components/ProfilePhotoGallery.svelte';
	import type { CoFeedEntry } from 'jazz-tools/dist/coValues/coFeed.js';
	import CommunityHeader from '$lib/components/CommunityHeader.svelte';
	import CommunityAccessManager from '$lib/components/CommunityAccessManager.svelte';

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
	const communityId = $derived(page.params.id) as ID<BrightBlurProfile>;

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

	const filteredPhotoArray = $derived(
		photoArray.filter((photo) => {
			return photo.current?._owner.getParentGroups()?.includes(community.current?._owner);
		})
	);
</script>

{#if community.current}
	<CommunityHeader {community} {canAdminCommunity} />
	<div class="tabs tabs-border">
		<input type="radio" name="profile_tabs" class="tab" aria-label="Uploads" checked={true} />
		<div class="tab-content p-4">
			<ProfilePhotoGallery
				photos={filteredPhotoArray}
				emptyHint="There are no photos in this community yet."
			/>
		</div>
		<input type="radio" name="profile_tabs" class="tab" aria-label="Members" checked={true} />
		<CommunityAccessManager {community} admin={canAdminCommunity || false} />
	</div>
{/if}
