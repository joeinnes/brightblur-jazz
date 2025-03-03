<script lang="ts">
	import { FileStream, type ID } from 'jazz-tools';
	const { photo } = $props();
	const getFile = async (id: ID<FileStream>) => {
		const blob = await FileStream.loadAsBlob(id);
		if (!blob) return;
		const url = URL.createObjectURL(blob);
		return url;
	};
	let naturalDimensions = $state({ w: 0, h: 0 });
	let actualDimensions = $state({ w: 0, h: 0 });
	let heightRatio = $derived(actualDimensions.h / naturalDimensions.h);
	let widthRatio = $derived(actualDimensions.w / naturalDimensions.w);
</script>

{#if photo && photo.file}
	<div class="relative w-full">
		{#await getFile(photo.file.id) then url}
			<img
				src={url}
				alt=""
				class="w-auto"
				bind:naturalHeight={naturalDimensions.h}
				bind:naturalWidth={naturalDimensions.w}
				bind:clientHeight={actualDimensions.h}
				bind:clientWidth={actualDimensions.w}
			/>
			{#each photo.faceSlices as slice}
				{#if slice?.file?.id}
					{#await getFile(slice.file.id) then url}
						<img
							src={url}
							alt=""
							style="left: {slice.x * widthRatio}px; top: {slice.y *
								heightRatio}px; width: {slice.width * widthRatio}px; position: absolute"
						/>
					{/await}
				{/if}
			{/each}
		{/await}

		<!--<button class="btn btn-error" onclick={() => photos.splice(i, 1)}>Delete</button>-->
	</div>
{/if}
