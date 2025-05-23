<script lang="ts">
	import { Group } from 'jazz-tools';

	import Cropper from 'svelte-easy-crop';

	import InviteViewerModal from '$lib/components/InviteViewerModal.svelte';
	import Avatar from './Avatar.svelte';
	import toast from '@natoune/svelte-daisyui-toast';
	import { createImage } from 'jazz-browser-media-images';
	import MingcuteCamera2AiLine from '../../icons/MingcuteCamera2AiLine.svelte';

	let avatarCropperModal: HTMLDialogElement | undefined = $state();

	let { community, canAdminCommunity } = $props();

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
		if (!canAdminCommunity) {
			toast.error('You do not have permission to update this profile.', { duration: 3000 });
			throw new Error('You do not have permission to update this profile.');
		}
		if (avatarFile && avatarFile[0]) {
			try {
				const avatarGroup = Group.create();
				avatarGroup.addMember('everyone', 'reader');

				const photoImage = await createImage(avatarFile[0], {
					owner: avatarGroup,
					maxSize: 256
				});

				if (community.current) {
					community.current.image = photoImage;
				}
			} catch (error) {
				console.error('Error resizing community avatar:', error);
				toast.error('Failed to update community avatar', { duration: 3000 });
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
		try {
			if (!avatarFile?.[0]) {
				throw new Error('No file selected');
			}

			const image = document.createElement('img');
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
		} catch (e: any) {
			console.error(e);
			toast.error(e.message, { duration: 3000 });
		}
	};
</script>

<div class="card-body gap-4 px-2 py-0">
	<div class="flex items-center gap-4">
		<div class="avatar placeholder">
			<label class="cursor-pointer">
				<div class="bg-neutral text-neutral-content h-24 w-24 rounded-full">
					<Avatar
						image={community.current.image}
						style="size-24"
						name={community.current.name}
						userId={community.current.id}
					/>
				</div>
				{#if canAdminCommunity}
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
							<MingcuteCamera2AiLine size={1.5} />
						</div>
					</div>
				{/if}
			</label>
		</div>

		<div class="flex w-full flex-grow flex-col gap-2 text-left">
			{#if canAdminCommunity}
				<div class="py-2">
					<InviteViewerModal item={community.current} onInviteSuccess={() => {}} />
				</div>
			{/if}
		</div>
	</div>
	<textarea
		class="textarea w-full"
		onchange={(e) => {
			community.current.description = e.currentTarget.value;
		}}>{community.current.description}</textarea
	>
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
