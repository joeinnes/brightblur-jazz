<script lang="ts">
	import { FileStream, Group } from 'jazz-tools';

	import Cropper from 'svelte-easy-crop';

	import Camera from 'lucide-svelte/icons/camera';

	import InviteViewerModal from '$lib/components/InviteViewerModal.svelte';
	import Avatar from './Avatar.svelte';
	let avatarCropperModal: HTMLDialogElement | undefined = $state();

	let { profile, isOwnProfile, canAdminProfile } = $props();

	let avatarFile: FileList | undefined = $state();
	let editName = $state(false);
	let croppedAreaPixels = $state({
		x: 0,
		y: 0,
		width: 0,
		height: 0
	});
	let cropInstance: Cropper | undefined = $state();

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

	const handleFileSelect = () => {
		avatarCropperModal?.show();
	};

	const handleCroppedImage = (blob: Blob) => {
		const fileList = new DataTransfer();
		fileList.items.add(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
		avatarFile = fileList.files;
		updateProfile();
		avatarFile = undefined;
	};

	const handleCropComplete = (croppedAreaPixels: {
		x: number;
		y: number;
		width: number;
		height: number;
	}) => {
		if (!avatarFile?.[0]) return;

		const image = new Image();
		const url = URL.createObjectURL(avatarFile[0]);
		image.src = url;
		image.onload = () => {
			URL.revokeObjectURL(url);
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');

			canvas.width = croppedAreaPixels.width;
			canvas.height = croppedAreaPixels.height;

			ctx?.drawImage(
				image,
				croppedAreaPixels.x,
				croppedAreaPixels.y,
				croppedAreaPixels.width,
				croppedAreaPixels.height,
				0,
				0,
				croppedAreaPixels.width,
				croppedAreaPixels.height
			);

			canvas.toBlob(
				(blob) => {
					if (blob) handleCroppedImage(blob);
				},
				'image/jpeg',
				0.9
			);
		};
	};
</script>

<div class="card-body gap-4 px-2 py-0">
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
						onchange={handleFileSelect}
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

			{#if isOwnProfile || canAdminProfile}
				<div>
					<!-- Keep this div to avoid the modal trigger being block-width -->
					<InviteViewerModal {profile} onInviteSuccess={() => {}} />
				</div>
			{/if}
		</div>
	</div>
</div>

<dialog class="modal w-full" bind:this={avatarCropperModal}>
	<div class="modal-box flex h-[100dvh] w-full max-w-full flex-col items-center p-0">
		<div class="relative h-full w-5/6 flex-1">
			<Cropper
				bind:this={cropInstance}
				image={avatarFile && avatarFile[0] ? URL.createObjectURL(avatarFile[0]) : undefined}
				aspect={1}
				oncropcomplete={(e) => (croppedAreaPixels = e.pixels)}
			/>
		</div>
		<div class="flex gap-2 py-4">
			<button
				class="btn btn-primary"
				onclick={() => {
					avatarCropperModal?.close();
					handleCropComplete(croppedAreaPixels);
				}}>Save</button
			>
			<button
				class="btn btn-error"
				onclick={() => {
					avatarFile = undefined;
					avatarCropperModal?.close();
				}}>Cancel</button
			>
		</div>
	</div>
</dialog>
