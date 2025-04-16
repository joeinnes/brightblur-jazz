<script lang="ts">
	import { Group } from 'jazz-tools';
	import { useAccount, useCoState } from 'jazz-svelte';
	import toast from '@natoune/svelte-daisyui-toast';
	import Image from './Image.svelte';
	import Avatar from './Avatar.svelte';
	import { BrightBlurAccount, Photo } from '$lib/schema';
	import { renderCanvas } from '$lib/utils/imageData.svelte';
	import MingcuteSettings3Line from '../../icons/MingcuteSettings3Line.svelte';
	const { me } = $derived(useAccount());
	const { photo: PhotoProp } = $props();
	let photoId = $derived(PhotoProp?.value?.id);
	let photographerId = $derived(PhotoProp?.by?.id);
	let madeAt = $derived(PhotoProp?.madeAt);

	const photo = $derived(
		photoId
			? useCoState(Photo, photoId, {
					resolve: {
						faceSlices: { $each: { person: true } }
					}
				})
			: null
	);

	const photographer = $derived(
		photographerId
			? useCoState(BrightBlurAccount, photographerId, {
					resolve: {
						profile: {
							avatar: true
						}
					}
				})
			: null
	);
</script>

{#if photo && photographer}
	<div class="relative w-full overflow-hidden rounded-2xl">
		<div
			class="text-base-100 absolute bottom-0 z-30 flex w-full items-center gap-2 bg-linear-to-t from-[oklch(38%_0.16_295)]/90 to-transparent p-2"
		>
			<a
				href="/profile/{photographer?.current?.profile?.id}"
				class="border-base-100 rounded-full border"
			>
				<Avatar
					image={photographer?.current?.profile?.avatar}
					name={photographer?.current?.profile?.name}
					userId={photographer?.current?.profile?.id}
				/>
			</a>
			<a href="/image/{photo?.current?.id}">
				<hgroup>
					<h3
						class="mb-0 leading-2 font-semibold"
						style="text-shadow: 0 1px 1px rgba(0, 0, 0, 0.7);"
					>
						{madeAt.toLocaleDateString('en-GB', {
							weekday: 'short',
							year: 'numeric',
							month: 'short',
							day: 'numeric'
						})}
					</h3>
				</hgroup>
			</a>

			<div class="dropdown dropdown-top dropdown-end ms-auto">
				<div role="button" tabindex="0" class="btn btn-square btn-outline btn-sm ms-auto">
					<MingcuteSettings3Line size={1.7} />
				</div>
				<ul
					class="menu dropdown-content bg-base-100 text-base-content rounded-box z-1 mb-3 w-64 gap-1 p-2 shadow"
				>
					<li>
						<button
							onclick={async () => {
								try {
									// Get the best image for download (prefer 1024px for reasonable size)
									if (!photo.current?.image) throw new Error('No photo selected.');
									const file = photo.current.image.highestResAvailable();
									if (!file) throw new Error('No photo found.');
									const blob = file.stream.toBlob();
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
									}, 200);
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
									if (!photo.current?.image) throw new Error('No photo selected.');
									const file = photo.current.image.highestResAvailable();
									if (!file) throw new Error('No photo found.');
									const blob = file.stream.toBlob();
									if (!blob) throw new Error('Could not read file.');
									const fileName = crypto.randomUUID() + '.jpg';
									const bitmap = await createImageBitmap(blob);
									const { width, height } = bitmap;
									bitmap.close();
									const canvas = document.createElement('canvas');
									canvas.width = width;
									canvas.height = height;
									if (!photo.current) throw new Error('No photo selected.');
									const imgSrc = URL.createObjectURL(blob);
									await renderCanvas(canvas, imgSrc, photo.current.faceSlices);
									setTimeout(() => URL.revokeObjectURL(imgSrc), 200);

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
									}, 200);
								} catch (e: any) {
									toast.error(e.message, { duration: 3000 });
								}
							}}
						>
							Download Unblurred Photo</button
						>
					</li>

					{#if photographer.current?.id === me?.id}
						<li>
							<button
								class="btn btn-error btn-sm"
								onclick={() => {
									try {
										if (photo.current) photo.current.isDeleted = true;
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

		<figure class="relative">
			{#if photoId}
				<Image id={photoId} />
			{/if}
		</figure>
	</div>
{/if}
