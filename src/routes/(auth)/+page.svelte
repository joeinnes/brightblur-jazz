<script lang="ts">
	import { FileStream, type ID } from 'jazz-tools';
	import { useCoState } from 'jazz-svelte';
	import { GlobalData, Photo } from '$lib/schema';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import RenderImage from '$lib/components/RenderImage.svelte';
	import { extractSortedPhotos } from '$lib/utils/profileUtils';
	import { getFile } from '$lib/utils/imageData';
	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			people: [],
			photos: []
		})
	);
	const photoArray: any[] = $derived(extractSortedPhotos(globalData));
	import Pica from 'pica';
</script>

<button
	class="btn btn-primary mb-4"
	onclick={async () => {
		console.log('here we go');
		for (let i = 0; i < photoArray.length; i++) {
			const file = await getFile(photoArray[i].value.file.id);
			console.log(`got file ${i} of ${photoArray.length}`);
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			canvas.width = file.width;
			canvas.height = file.height;
			ctx?.drawImage(file, 0, 0);
			console.log('drew ', canvas.width);
			const newCanvas = document.createElement('canvas');
			if (canvas.width <= 2048) continue;
			newCanvas.width = 2048;
			newCanvas.height = 2048 * (canvas.height / canvas.width);
			const pica = new Pica();

			console.log('let me resize');
			await pica.resize(canvas, newCanvas, {
				filter: 'lanczos2'
			});
			const resizedImage: Blob = await new Promise((resolve, reject) => {
				newCanvas.toBlob(
					(r) => {
						if (r instanceof Blob) {
							resolve(r);
						} else {
							reject();
						}
					},
					'image/jpeg',
					0.9
				);
			});
			const image = await FileStream.createFromBlob(resizedImage, {
				owner: photoArray[i].value.file.owner
			});
			const thisPhoto = await Photo.load(photoArray[i].value.id, { file: [] });
			if (!thisPhoto) return;
			thisPhoto.fullSizeFile = thisPhoto.file;
			thisPhoto.file = image;
			console.log(`done file ${i} of ${photoArray.length}`);
		}
	}}
>
	Fixes
</button>

{#if photoArray}
	<div class="grid gap-4">
		{#each photoArray as photo, i (photo?.value?.id || i)}
			<RenderImage {photo} />
		{:else}
			<div>
				<p class="pb-2">It's a bit quiet round here.</p>
				<a href="/new" class="btn btn-primary">Get the party started?</a>
			</div>
		{/each}
	</div>
{/if}
