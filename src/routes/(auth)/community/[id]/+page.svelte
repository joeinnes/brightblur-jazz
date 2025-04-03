<script lang="ts">
	import { useAccount, useCoState } from 'jazz-svelte';
	import { type ID } from 'jazz-tools';
	import { page } from '$app/state';
	import { BrightBlurProfile, Photo, Community, BrightBlurAccount } from '$lib/schema';
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
	/*
	// Get global data for people
	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			resolve: { photos: true, people: true }
		})
	);

	// Get all people and filter for managed people
	let allPeople = $derived(extractAllPeople(globalData));
	let myManagedPeople = $derived(
		allPeople && filterManagedPeople(allPeople, me?.id, me?.profile?.id)
	);

	const photoArray = $derived(extractSortedPhotos(globalData?.current?.photos || undefined));

	 const uploadedPhotos: CoFeedEntry<Photo>[] = $derived(
		filterPhotosByUploader(photoArray, profile?.current?.user?.id)
	);
const photosOfProfile = $derived(filterPhotosOfPerson(photoArray, profileId));*/
</script>

{community.current?.id} - co_zaZ3YPZsj2ycRBErph7gA6EPEJd
{#if community.current}
	<CommunityHeader {community} {canAdminCommunity} />
	<div class="tabs tabs-border">
		<!-- Photo Gallery - Uploads Tab -->
		<input type="radio" name="community_tabs" class="tab" aria-label="Members" checked={true} />
		<CommunityAccessManager {community} admin={canAdminCommunity || false} />
	</div>
{/if}
