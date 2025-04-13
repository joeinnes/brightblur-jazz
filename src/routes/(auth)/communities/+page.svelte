<script>
	import { useAccount } from 'jazz-svelte';

	import CommunitiesList from '$lib/components/CommunitiesList.svelte';
	import NavBar from '$lib/components/NavBar.svelte';

	let { me } = $derived(
		useAccount({
			resolve: {
				root: {
					myCommunities: true
				}
			}
		})
	);
</script>

<NavBar><h3 class="text-lg font-bold">Communities</h3></NavBar>
<main class="container mx-auto max-w-xl flex-1 px-4">
	<CommunitiesList communities={me?.root?.myCommunities} />
</main>
