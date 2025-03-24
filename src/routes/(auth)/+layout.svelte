<script lang="ts">
	// @ts-ignore
	// This is added by VitePWA, so TS can't find it
	import { pwaInfo } from 'virtual:pwa-info';
	import { GlobalData, FeedOfProfiles, FeedOfPhotos } from '$lib/schema';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import { useAccount, useCoState } from 'jazz-svelte';
	import type { ID } from 'jazz-tools';
	import { Group } from 'jazz-tools';

	const { children } = $props();

	import NavBar from '$lib/components/NavBar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { extractAllPeople } from '$lib/utils/profileUtils';

	const { me } = useAccount();

	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			resolve: { photos: true, people: true }
		})
	);

	if (!PUBLIC_GLOBAL_DATA) {
		const feedGroup = Group.create();
		feedGroup.addMember('everyone', 'writer');
		const globalDataGroup = Group.create();
		globalDataGroup.addMember('everyone', 'reader');
		const newGlobalData = GlobalData.create(
			{
				photos: FeedOfPhotos.create([], { owner: feedGroup }),
				people: FeedOfProfiles.create([], { owner: feedGroup })
			},
			{
				owner: globalDataGroup
			}
		);

		console.log('SET PUBLIC_GLOBAL_DATA TO', newGlobalData.id);
	}
	let listOfPeople = $derived(extractAllPeople(globalData));

	$effect(() => {
		// User must have added their own profile to the feed
		if (listOfPeople !== undefined && me) {
			me.ensureLoaded({ resolve: { profile: true } }).then((me) => {
				const myProfile = listOfPeople.find((profile) => {
					if (profile && profile.value) return profile.value.id === me?.profile?.id;
					return false;
				});

				if (myProfile === undefined) {
					if (me.profile) {
						globalData.current?.people.push(me.profile);
					}
				}

				if (!me.profile.user) {
					me.profile.user = me;
				}
			});
		}
	});
</script>

<svelte:head>
	{#if pwaInfo}
		<link rel="manifest" href={pwaInfo.webManifest.href} />
		<meta name="theme-color" content="#ffffff" />
	{/if}
</svelte:head>

<div class="flex min-h-screen flex-col">
	<NavBar />

	<main class="container mx-auto mb-24 max-w-xl flex-1">
		{@render children()}
	</main>

	<Footer />
</div>
