<script lang="ts">
	import { FileStream, Group } from 'jazz-tools';
	import Camera from 'lucide-svelte/icons/camera';

	import InviteViewerModal from '$lib/components/InviteViewerModal.svelte';
	import Avatar from './Avatar.svelte';

	let { profile, isOwnProfile, canAdminProfile } = $props();

	let avatarFile: FileList | undefined = $state();
	let editName = $state(false);

	const updateProfile = async () => {
		if (!canAdminProfile) return;
		if (avatarFile && avatarFile[0]) {
			const avatarGroup = Group.create();
			avatarGroup.addMember('everyone', 'reader');
			const fileStream = await FileStream.createFromBlob(avatarFile[0], {
				owner: avatarGroup
			});
			if (profile.current) {
				profile.current.avatar = fileStream;
			}
		}
	};
</script>

<div class="card-body gap-4 p-0">
	<div class="flex items-center gap-4">
		<div class="avatar placeholder">
			<label class="cursor-pointer">
				<div class="bg-neutral text-neutral-content h-24 w-24 rounded-full">
					<Avatar id={profile?.current?.avatar?.id} style="size-24" name={profile.current.name} />
				</div>
				{#if canAdminProfile}
					<input
						type="file"
						accept="image/*"
						class="hidden"
						bind:files={avatarFile}
						onchange={updateProfile}
					/>
					<div class=" absolute -right-1 -bottom-2">
						<div class="btn btn-circle btn-xs text-base-content bg-base-200 p-1">
							<!-- Use a div here, it's not actually an interactive element, it just triggers the hidden input because it's inside the label -->
							<Camera />
						</div>
					</div>
				{/if}
			</label>
		</div>

		<div class="flex flex-grow flex-col gap-2">
			{#if canAdminProfile}
				{#if !editName}
					<button
						class="btn btn-ghost justify-start px-2 text-3xl font-bold"
						onclick={() => (editName = true)}
					>
						{profile.current.name}
					</button>
					{#if !isOwnProfile}
						<div class="badge badge-primary">You can administer this profile</div>
					{/if}
				{:else}
					<div class="join w-full">
						<!-- Svelte thinks that profile.current.name is not reactive. I assume there's some Jazz action in the background here. -->
						<input
							type="text"
							class="input input-lg join-item w-full text-3xl font-bold"
							bind:value={profile.current.name}
							onblur={() => (editName = false)}
						/>
						<button class="btn btn-lg join-item" onclick={() => (editName = false)}> Save </button>
					</div>
				{/if}
			{:else}
				<h1 class="text-3xl font-bold">{profile.current.name}</h1>
			{/if}

			{#if isOwnProfile}
				<div>
					<!-- Keep this div to avoid the modal trigger being block-width -->
					<InviteViewerModal {profile} onInviteSuccess={() => {}} />
				</div>
			{/if}
		</div>
	</div>
</div>
