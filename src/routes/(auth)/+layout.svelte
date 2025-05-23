<script lang="ts">
	// @ts-ignore
	// This is added by VitePWA, so TS can't find it
	import { pwaInfo } from 'virtual:pwa-info';
	import { GlobalData, FeedOfProfiles, FeedOfPhotos, RequestToView } from '$lib/schema';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import { useAccount, useCoState } from 'jazz-svelte';
	import type { ID } from 'jazz-tools';
	import { Group, Inbox } from 'jazz-tools';

	const { children } = $props();

	import { extractAllPeople } from '$lib/utils/profileUtils';
	import Footer from '$lib/components/Footer.svelte';

	const { me } = $derived(useAccount({ resolve: { profile: true } }));

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

		console.info('SET PUBLIC_GLOBAL_DATA TO', newGlobalData.id);
	}
	let listOfPeople = $derived(extractAllPeople(globalData));

	$effect(() => {
		// User must have added their own profile to the feed
		if (listOfPeople !== undefined && me) {
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
		}
	});
</script>

<svelte:head>
	{#if pwaInfo}
		<link rel="manifest" href={pwaInfo.webManifest.href} />
		<meta name="theme-color" content="#ffffff" />
	{/if}
</svelte:head>

<div class="flex min-h-screen flex-col pb-24">
	{@render children()}
</div>

<Footer />
