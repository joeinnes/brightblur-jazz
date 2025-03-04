<script lang="ts">
	import { FileStream, type ID } from 'jazz-tools';
	import { useCoState } from 'jazz-svelte';
	import User from 'lucide-svelte/icons/user';
	import Image from './Image.svelte';
	import { BrightBlurAccount, Photo, BrightBlurProfile } from '$lib/schema';
	const { photo: photoProp } = $props();

	const photo = $derived(
		photoProp?.value?.id
			? useCoState(Photo, photoProp.value.id, {
					faceSlices: [
						{
							file: []
						}
					]
				})
			: {}
	);
	$inspect(photo);

	const photographer = $derived(
		photoProp?.by?.id
			? useCoState(BrightBlurAccount, photoProp.by.id, {
					profile: {
						avatar: []
					}
				})
			: {}
	);
</script>

<div class="w-full">
	<div class="mb-2 flex items-center gap-2">
		{#if photographer?.current?.profile?.avatar?.id}
			{#await FileStream.loadAsBlob(photographer?.current?.profile?.avatar?.id) then blob}
				{#if blob}
					<img
						src={URL.createObjectURL(blob)}
						alt="Profile"
						class="border-primary size-10 rounded-full border-2 object-cover"
					/>
				{/if}
			{/await}
		{:else}
			<div class="border-primary size-10 rounded-full border-2 bg-gray-200"></div>
		{/if}
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
	</div>

	<figure class="relative my-2">
		{#if photoProp?.value?.id}
			<Image id={photoProp.value.id} />
		{/if}
	</figure>

	<!--<button class="btn btn-error" onclick={() => photos.splice(i, 1)}>Delete</button>-->

	{#if photo?.current?.faceSlices}
		{#each photo.current.faceSlices as slice}
			{#if slice?.person?.name}
				{@const hue =
					slice.person.name
						.split('')
						.reduce((acc: number, curr: string) => acc + curr.charCodeAt(0), 0) % 360}
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
