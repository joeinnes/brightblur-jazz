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
	import CommunitiesList from '$lib/components/CommunitiesList.svelte';

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
	let profileNameModal: HTMLDialogElement | undefined = $state();
	let prevName = $state('');
</script>

<div class="navbar bg-base-100 sticky top-0 z-50 mb-2 gap-2 px-4">
	<div class="navbar-start">
		<button
			class="btn btn-circle btn-ghost flex items-center text-2xl font-bold"
			onclick={() => window.history.back()}>&larr;</button
		>
	</div>
	<div class="navbar-center px-2">
		{#if canAdminProfile && profile.current?.name}
			<button
				class="btn btn-ghost justify-start px-2 text-lg font-bold"
				onclick={() => {
					prevName = profile.current?.name || '';
					profileNameModal?.showModal();
				}}
			>
				{profile.current?.name}
			</button>
		{:else}<h3 class="text-lg font-bold">{profile.current?.name}</h3>{/if}
	</div>
	<div class="navbar-end"></div>
</div>

<dialog class="modal" bind:this={profileNameModal}>
	<div class="modal-box">
		<h3 class="mb-2 text-lg font-bold">Update name</h3>
		{#if profile.current?.name}
			<input type="text" class="input join-item" bind:value={profile.current.name} />
			<div class="modal-action">
				<form method="dialog">
					<!-- if there is a button in form, it will close the modal -->
					<button
						class="btn"
						onclick={() => {
							// @ts-ignore checked on line 94
							profile.current.name = prevName;
						}}>Cancel</button
					>
					<button class="btn btn-primary">Save</button>
				</form>
			</div>
		{/if}
	</div>
</dialog>

<div class="container mx-auto max-w-xl flex-1 px-4">
	{#if profile.current}
		<ProfileHeader {profile} {isOwnProfile} {canAdminProfile} />

		<div class="tabs tabs-border">
			<!-- Photo Gallery - Uploads Tab -->
			<input type="radio" name="profile_tabs" class="tab" aria-label="Uploads" checked={true} />
			<div class="tab-content">
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
			<div class="tab-content">
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
			{#if isOwnProfile && me}
				<input type="radio" name="profile_tabs" class="tab" aria-label="My Managed Users" />
				<ManagedUsersList managedPeople={myManagedPeople} />

				<input type="radio" name="profile_tabs" class="tab" aria-label="Communities" />
				<CommunitiesList communities={me.root?.myCommunities} />
			{/if}
		</div>
	{/if}
</div>
