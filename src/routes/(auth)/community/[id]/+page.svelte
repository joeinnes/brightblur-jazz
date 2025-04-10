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
	let communityNameModal: HTMLDialogElement | undefined = $state();
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
	</div>
	<div class="navbar-end"></div>
</div>
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
<main class="container mx-auto mb-24 max-w-xl flex-1 px-4">
	{#if community.current}
		<CommunityHeader {community} {canAdminCommunity} />
		<div class="tabs tabs-border">
			<!-- Photo Gallery - Uploads Tab -->
			<input type="radio" name="community_tabs" class="tab" aria-label="Members" checked={true} />
			<CommunityAccessManager {community} admin={canAdminCommunity || false} />
		</div>
	{/if}
</main>
