<script lang="ts">
	import type { ID } from 'jazz-tools';
	import { useAccount, useCoState } from 'jazz-svelte';
	const { logOut } = useAccount();
	import { GlobalData } from '$lib/schema';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import RenderImage from '$lib/components/RenderImage.svelte';
	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			people: [],
			photos: []
		})
	);
	const photos = $derived(globalData.current?.photos);
</script>

{#if photos}
	<div class="grid gap-4">
		{#each Object.values(photos).map((photo) => photo.value) as photo, i}
			{#if photo && photo.file}
				<RenderImage {photo} />
			{/if}
		{/each}
	</div>
{/if}
<button onclick={logOut}>Log Out</button>
