<script lang="ts">
	import { useAccount, useCoState } from 'jazz-svelte';
	import { type ID } from 'jazz-tools';
	import { page } from '$app/state';
	import { GlobalData, BrightBlurProfile, Photo } from '$lib/schema';
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

	const { me } = useAccount();

	// Get profile ID from URL parameter, handle 'me' special case
	const profileId = $derived(
		page.params.id === 'me' ? me?.profile?.id : page.params.id
	) as ID<BrightBlurProfile>;

	const profile = $derived(useCoState(BrightBlurProfile, profileId, {}));
	const isOwnProfile = $derived(profileId === me?.profile?.id);

	// Check if current user can administer the viewed profile
	const canAdminProfile = $derived(profileId && profile.current && me?.canAdmin(profile.current));

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
	const photosOfProfile = $derived(filterPhotosOfPerson(photoArray, profileId));
</script>

{#if profile.current}
	<ProfileHeader {profile} {isOwnProfile} {canAdminProfile} />

	<div class="tabs tabs-border">
		<!-- Photo Gallery - Uploads Tab -->
		<input type="radio" name="profile_tabs" class="tab" aria-label="Uploads" checked={true} />
		<div class="tab-content p-4">
			<ProfilePhotoGallery
				photos={uploadedPhotos}
				emptyHint="{isOwnProfile
					? `You haven't`
					: `${profile.current.name.split(' ')[0]} hasn't`} uploaded any photos yet."
			/>
		</div>

		<!-- Photo Gallery - Photos Of User Tab -->
		<input
			type="radio"
			name="profile_tabs"
			class="tab"
			aria-label="Photos of {profile.current?.name || 'user'}"
		/>
		<div class="tab-content p-4">
			<ProfilePhotoGallery
				photos={photosOfProfile}
				emptyHint="No photos {isOwnProfile
					? `of you`
					: `of ${profile.current.name.split(' ')[0]}`} yet."
			/>
		</div>

		<!-- Access Management Tab -->
		{#if isOwnProfile || canAdminProfile}
			<input type="radio" name="profile_tabs" class="tab" aria-label="Manage Access" />
			<ProfileAccessManager {profile} />
		{/if}

		<!-- Managed Users Tab -->
		{#if isOwnProfile}
			<input type="radio" name="profile_tabs" class="tab" aria-label="My Managed Users" />
			<ManagedUsersList managedPeople={myManagedPeople} />
		{/if}
	</div>
{/if}
