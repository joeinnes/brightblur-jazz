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
	import NavBar from '$lib/components/NavBar.svelte';
	import MingcuteGrid2Line from '../../../../icons/MingcuteGrid2Line.svelte';
	import MingcuteUserLockLine from '../../../../icons/MingcuteUserLockLine.svelte';
	import MingcuteUserVisibleLine from '../../../../icons/MingcuteUserVisibleLine.svelte';
	import MingcuteGroup3Line from '../../../../icons/MingcuteGroup3Line.svelte';
	import MingcuteUser4Line from '../../../../icons/MingcuteUser4Line.svelte';

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

<NavBar>
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
</NavBar>

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

		<div class="tabs tabs-box mt-4 justify-between">
			<!-- Photo Gallery - Uploads Tab -->
			<label class="tab">
				<MingcuteGrid2Line size={2} />
				<input type="radio" name="profile_tabs" checked={true} />
			</label>
			<div class="tab-content">
				<ProfilePhotoGallery
					photos={uploadedPhotos}
					emptyHint="{isOwnProfile
						? `You haven't`
						: `${profile.current.name.split(' ')[0]} hasn't`} uploaded any photos yet."
				/>
			</div>

			<!-- Photo Gallery - Photos Of User Tab -->
			<label class="tab">
				<MingcuteUser4Line size={2} />
				<input type="radio" name="profile_tabs" />
			</label>
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
				<label class="tab">
					<MingcuteUserLockLine size={2} />
					<input type="radio" name="profile_tabs" />
				</label>
				<ProfileAccessManager {profile} />
			{/if}

			<!-- Managed Users Tab -->
			{#if isOwnProfile && me}
				<label class="tab"
					><MingcuteUserVisibleLine size={2} />
					<input type="radio" name="profile_tabs" />
				</label>
				<ManagedUsersList managedPeople={myManagedPeople} />

				<label class="tab">
					<MingcuteGroup3Line size={2} />
					<input type="radio" name="profile_tabs" />
				</label>
				<div class="tab-content p-4">
					<CommunitiesList communities={me.root?.myCommunities} />
				</div>
			{/if}
		</div>
	{/if}
</div>

<style lang="postcss">
	@reference "tailwindcss";
	.tab {
		@apply mb-2;
	}
</style>
