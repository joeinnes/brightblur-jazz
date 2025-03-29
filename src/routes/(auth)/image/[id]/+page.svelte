<script lang="ts">
	import { page } from '$app/state';
	import RenderImage from '$lib/components/RenderImage.svelte';
	import { Photo } from '$lib/schema';
	import { useCoState } from 'jazz-svelte';
	import { type ID } from 'jazz-tools';
	const photoId = $derived(page.params.id) as ID<Photo> | undefined;
	const photo = $derived(useCoState(Photo, photoId, {}));
	const meta = $derived(photo.current?._edits.image);
	const photoProp = $derived({
		...meta,
		value: photo.current
	});
</script>

<RenderImage photo={photoProp} />
