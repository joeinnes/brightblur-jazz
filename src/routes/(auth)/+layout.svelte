<script lang="ts">
	// @ts-ignore
	// This is added by VitePWA, so TS can't find it
	import { pwaInfo } from 'virtual:pwa-info';
	import { GlobalData, FeedOfPeople, FeedOfPhotos } from '$lib/schema';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import { useAccount, useCoState } from 'jazz-svelte';
	import type { ID } from 'jazz-tools';
	import { onMount } from 'svelte';
	import { Group } from 'jazz-tools';

	import Camera from 'lucide-svelte/icons/camera';
	import CircleUserRound from 'lucide-svelte/icons/circle-user-round';
	import House from 'lucide-svelte/icons/house';

	const { me } = useAccount();
	//console.log({ owner: me?.profile?._owner?.getRoleOf('everyone') });
	const globalData = $derived.by(() => {
		if (!PUBLIC_GLOBAL_DATA) {
			const group = Group.create();
			group.addMember('everyone', 'reader');
			const newGlobalData = GlobalData.create({
				photos: FeedOfPhotos.create([], { owner: group }),
				people: FeedOfPeople.create([], { owner: group })
			});
			console.log('SET PUBLIC_GLOBAL_DATA TO', newGlobalData.id);
			return useCoState(GlobalData, newGlobalData.id as ID<GlobalData>, { people: [], photos: [] });
		}

		return useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, { people: [], photos: [] });
	});

	let listOfPeople = $derived.by(() => {
		const allPeople = [];
		if (globalData.current?.people) {
			for (const [_, entries] of Object.entries(globalData.current.people)) {
				for (const entry of entries.all) {
					allPeople.push(entry);
				}
			}
		}
		return allPeople;
	});

	$effect(() => {
		if (listOfPeople !== undefined) {
			me.ensureLoaded({ profile: { person: {} } }).then((me) => {
				const myPerson = listOfPeople.find((person) => {
					return person.value.id === me?.profile?.person?.id;
				});
				if (myPerson === undefined) {
					if (me.profile.person) {
						globalData.current?.people.push(me.profile.person);
					}
				}
			});
		}
	});

	let { children } = $props();
	onMount(async () => {
		if (pwaInfo) {
			// @ts-ignore
			// This is added by VitePWA, so TS can't find it
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({
				immediate: true,
				onRegistered(r: any) {
					// uncomment following code if you want check for updates
					// r && setInterval(() => {
					//    console.log('Checking for sw update')
					//    r.update()
					// }, 20000 /* 20s for testing purposes */)
				},
				onRegisterError(error: any) {
					console.log('SW registration error', error);
				}
			});
		}
	});
	let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');
</script>

<svelte:head>
	{@html webManifestLink}
</svelte:head>

<header></header>

<main class="mx-auto max-w-xl flex-1 items-center justify-center pb-20">
	{@render children()}
</main>

<div class="dock">
	<a href="/" class="dock-item">
		<House class="h-6 w-6" />
		<span class="dock-label">Home</span>
	</a>

	<a href="/new" class="dock-item bg-primary text-primary-content rounded-md">
		<Camera class=" h-6 w-6" />
		<span class="dock-label">Upload</span>
	</a>

	<a href="/user/me" class="dock-item">
		<CircleUserRound class="h-6 w-6" />
		<span class="dock-label">Me</span>
	</a>
</div>
