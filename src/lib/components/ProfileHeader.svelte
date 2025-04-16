<script lang="ts">
	import { Account, Group, Inbox, InboxSender, type ID } from 'jazz-tools';

	import Cropper from 'svelte-easy-crop';
	import InviteViewerModal from '$lib/components/InviteViewerModal.svelte';
	import Avatar from './Avatar.svelte';
	import toast from '@natoune/svelte-daisyui-toast';
	import { createImage } from 'jazz-browser-media-images';
	import MingcuteCamera2AiLine from '../../icons/MingcuteCamera2AiLine.svelte';
	import { useAccount } from 'jazz-svelte';
	import { RequestToView } from '$lib/schema';

	let avatarCropperModal: HTMLDialogElement | undefined = $state();

	let { profile, isOwnProfile, canAdminProfile } = $props();

	let { me } = $derived(useAccount());
	let avatarFile: FileList | undefined = $state();
	let croppedAreaPixels = $state({
		x: 0,
		y: 0,
		width: 0,
		height: 0
	});
	let cropInstance: Cropper | undefined = $state();

	const updateProfile = async () => {
		if (!canAdminProfile) {
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

				if (profile.current) {
					profile.current.avatar = photoImage;
				}
			} catch (error) {
				console.error('Error resizing avatar:', error);
				toast.error('Failed to update avatar', { duration: 3000 });
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

<div class="container">
	<div class="flex items-center gap-4">
		<div class="avatar placeholder">
			<label class="cursor-pointer">
				<div class="bg-neutral text-neutral-content h-24 w-24 rounded-full">
					<Avatar
						image={profile?.current?.avatar}
						style="size-24"
						name={profile.current.name}
						userId={profile.current.id}
					/>
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
							<MingcuteCamera2AiLine size={1.5} />
						</div>
					</div>
				{/if}
			</label>
		</div>

		<div class="flex flex-grow gap-2">
			{#if !isOwnProfile}
				{#if !me?.root?.myContacts?.some((el) => el?.id === profile?.current?.id)}<button
						class="btn"
						onclick={() => me?.root?.myContacts?.push(profile?.current)}>Add to Contacts</button
					>{:else}<button
						class="btn"
						onclick={() => {
							const idx = me?.root?.myContacts?.findIndex((el) => el?.id === profile?.current?.id);
							if (!idx || idx < 0) return;
							me?.root?.myContacts?.splice(idx, 1);
						}}>Remove from Contacts</button
					>{/if}
			{/if}
			{#if isOwnProfile || canAdminProfile}
				<!-- Keep this div to avoid the modal trigger being block-width -->
				<InviteViewerModal
					item={profile.current}
					onInviteSuccess={() => {}}
					buttonText="Invite a viewer"
				/>
				<button
					onclick={() => {
						profile.current.isDeleted = true;
					}}
					class="btn btn-error">Delete</button
				>
			{:else}
				<button
					class="btn btn-primary"
					onclick={async () => {
						if (!me) return;
						const approvers = profile.current._owner
							.castAs(Group)
							.members.filter(
								(member: Account & { role: 'reader' | 'writer' | 'admin' }) =>
									member.role === 'admin'
							);
						const messageOwner = Group.create({ owner: me });
						const message = RequestToView.create(
							{
								state: 'pending'
							},
							{
								owner: messageOwner
							}
						);

						await Promise.all(
							approvers.forEach(async (approver: { account: Account; id: ID<Account> }) => {
								messageOwner.addMember(approver.account, 'writer');
								const inboxSender = await InboxSender.load(approver.id, me);
								await inboxSender.sendMessage(message);
							})
						);
					}}
				>
					Request to view
				</button>
			{/if}
		</div>
	</div>
</div>

<dialog class="modal w-full" bind:this={avatarCropperModal}>
	<div class="modal-box flex h-[100dvh] w-full max-w-full flex-col items-center p-2">
		<div class="relative h-full w-full flex-1">
			<Cropper
				bind:this={cropInstance}
				image={avatarFile && avatarFile[0] ? URL.createObjectURL(avatarFile[0]) : undefined}
				aspect={1}
				oncropcomplete={(e) => (croppedAreaPixels = e.pixels)}
			/>
		</div>
		<p class="px-2 text-sm">
			Avatars are always viewable by everyone. Click <strong>Cancel</strong> if you do not want to upload
			a publicly viewable image.
		</p>
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
