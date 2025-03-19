<script lang="ts">
	import { FileStream, Group } from 'jazz-tools';
	import { useAccount, useCoState } from 'jazz-svelte';
	import toast from '@natoune/svelte-daisyui-toast';
	import EllipsisVertical from 'lucide-svelte/icons/ellipsis-vertical';
	import User from 'lucide-svelte/icons/user';
	import Image from './Image.svelte';
	import Avatar from './Avatar.svelte';
	import { BrightBlurAccount, ListOfImages, Photo } from '$lib/schema';
	import { renderCanvas } from '$lib/utils/imageData';
	import { getUserHue } from '$lib/utils/userUtils';
	const { me } = useAccount();
	const { photo: photoProp } = $props();

	const photo = $derived(
		photoProp?.value?.id
			? useCoState(Photo, photoProp.value.id, {
					images: [
						{
							file: []
						}
					],
					faceSlices: [
						{
							images: [
								{
									file: []
								}
							],
							person: {}
						}
					]
				})
			: {}
	);

	const photographer = $derived(
		photoProp?.by?.id
			? useCoState(BrightBlurAccount, photoProp.by.id, {
					profile: {
						avatar: []
					}
				})
			: {}
	);

	// Helper function to get the best image file ID based on desired size
	function getBestImageFileId(images: ListOfImages | undefined | null, preferFullSize = false) {
		if (!images || images.length === 0) return null;

		if (preferFullSize) {
			// Get the largest image (original)
			const sortedImages = [...images].sort((a, b) => {
				if (!a || !b) return 0;
				return (b.size || 0) - (a.size || 0);
			});

			return sortedImages[0]?.file?.id;
		} else {
			// Get a reasonable size for display (prefer 1024px if available)
			const preferredSize = 1024;
			let bestImage = images[0];

			for (const img of images) {
				if (!img) continue;
				if (img.size === preferredSize) {
					return img.file?.id;
				}
				if ((img.size || 0) > (bestImage?.size || 0) && (img.size || 0) <= preferredSize) {
					bestImage = img;
				}
			}

			return bestImage?.file?.id;
		}
	}
</script>

<div class="w-full">
	<div class="mb-2 flex items-center gap-2 px-2">
		<Avatar
			id={photographer?.current?.profile?.avatar?.id}
			name={photographer?.current?.profile?.name}
			userId={photographer?.current?.profile?.id}
		/>
		<hgroup>
			<h3 class="mb-0 leading-2 font-bold">
				<a href="/profile/{photographer?.current?.profile?.id}">
					@{photographer?.current?.profile?.name}
				</a>
			</h3>
			<small class="opacity-60">
				{photoProp.madeAt.toLocaleDateString('en-GB', {
					hour: '2-digit',
					minute: '2-digit',
					weekday: 'short',
					year: 'numeric',
					month: 'short',
					day: 'numeric'
				})}
			</small>
		</hgroup>
		<div class="dropdown dropdown-end ms-auto">
			<div role="button" tabindex="0" class="btn btn-square btn-outline btn-sm btn- ms-auto">
				<EllipsisVertical />
			</div>
			<ul class="menu dropdown-content bg-base-100 rounded-box z-1 mt-3 w-64 gap-1 p-2 shadow">
				<li>
					<button
						onclick={async () => {
							try {
								// Get the best image for download (prefer 1024px for reasonable size)
								const fileId = getBestImageFileId(photo.current?.images);
								if (!fileId) throw new Error('No photo selected.');

								const blob = await FileStream.loadAsBlob(fileId);
								if (!blob) throw new Error('Could not read file.');

								const fileName = crypto.randomUUID() + '.jpg';
								if (navigator && navigator?.canShare?.()) {
									const img = new File([blob], fileName, { type: 'image/jpeg' });
									navigator.share({
										title: 'BrightBlur Photo',
										text: 'Check out this photo on BrightBlur!',
										files: [img]
									});
									return null;
								}
								const url = URL.createObjectURL(blob);
								const a = document.createElement('a');

								a.download = fileName;
								a.href = url;
								a.target = '_blank';
								document.body.appendChild(a);
								a.dispatchEvent(
									new MouseEvent('click', {
										bubbles: true,
										cancelable: true,
										view: window
									})
								);
								document.body.removeChild(a);
								setTimeout(() => {
									URL.revokeObjectURL(url);
									a.remove();
								}, 100);
							} catch (e: any) {
								toast.error(e.message, { duration: 3000 });
							}
						}}
					>
						Download Blurred Photo</button
					>
				</li>
				<li>
					<button
						onclick={async () => {
							try {
								// Get the original/full size image
								const fileId = getBestImageFileId(photo.current?.images, true);
								if (!fileId) throw new Error('No photo selected.');

								const blob = await FileStream.loadAsBlob(fileId);
								if (!blob) throw new Error('Could not read file.');

								const fileName = crypto.randomUUID() + '.jpg';
								const bitmap = await createImageBitmap(blob);
								const { width, height } = bitmap;
								bitmap.close();
								const canvas = document.createElement('canvas');
								canvas.width = width;
								canvas.height = height;
								if (!photo.current) throw new Error('No photo selected.');
								await renderCanvas(canvas, photo.current, { w: width, h: height }, true);
								if (navigator && navigator?.canShare?.()) {
									const blob = canvas.toBlob((blob) => {
										if (!blob) throw new Error('Could not read file.');
										const img = new File([blob], fileName, { type: 'image/jpeg' });
										navigator.share({
											title: 'BrightBlur Photo',
											text: 'Check out this photo on BrightBlur!',
											files: [img]
										});
									});
									return null;
								}
								const url = canvas.toDataURL('image/jpeg', 1.0);
								const a = document.createElement('a');
								a.download = fileName;
								a.href = url;
								a.target = '_blank';
								document.body.appendChild(a);
								a.dispatchEvent(
									new MouseEvent('click', {
										bubbles: true,
										cancelable: true,
										view: window
									})
								);
								document.body.removeChild(a);
								setTimeout(() => {
									URL.revokeObjectURL(url);
									a.remove();
								}, 100);
							} catch (e: any) {
								toast.error(e.message, { duration: 3000 });
							}
						}}
					>
						Download Unblurred Photo</button
					>
				</li>

				{#if photographer.current?.id === me.id}
					<li>
						<button
							class="btn btn-error btn-sm"
							onclick={() => {
								try {
									const owningGroup = photo.current?._owner.castAs(Group);
									if (!owningGroup)
										throw new Error("Couldn't work out who owns this. Maybe it was deleted?");
									owningGroup.members.forEach((member) => {
										owningGroup.removeMember(member.account);
									});
								} catch (e: any) {
									toast.error(e.message, { duration: 3000 });
								}
							}}>Delete Photo</button
						>
					</li>
				{/if}
			</ul>
		</div>
	</div>

	<figure class="relative my-2">
		{#if photoProp?.value?.id}
			<Image id={photoProp.value.id} />
		{/if}
	</figure>

	<!--<button class="btn btn-error" onclick={() => photos.splice(i, 1)}>Delete</button>-->

	<div class="px-2">
		{#if photo?.current?.faceSlices}
			{#each photo.current.faceSlices as slice}
				{#if slice?.person?.name}
					{@const hue = getUserHue(slice.person.id)}
					<a href="/profile/{slice.person.id}">
						<div
							class="badge badge-sm"
							style="background-color: oklch(85% 0.21 {hue}); color: oklch(10% 0.21 {hue});"
						>
							<User class="mr-0.5 w-[1em]" />{slice.person.name}
						</div>
					</a>
				{/if}
			{/each}
		{/if}
	</div>
</div>
