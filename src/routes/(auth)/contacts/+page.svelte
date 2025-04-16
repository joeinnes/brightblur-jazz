<script lang="ts">
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import Avatar from '$lib/components/Avatar.svelte';
	import NavBar from '$lib/components/NavBar.svelte';
	import { GlobalData } from '$lib/schema';
	import { extractAllPeople } from '$lib/utils/profileUtils';
	import { useAccount, useCoState } from 'jazz-svelte';
	import type { ID } from 'jazz-tools';
	import MingcuteUserRemove2Line from '../../../icons/MingcuteUserRemove2Line.svelte';
	import MingcuteUserAdd2Line from '../../../icons/MingcuteUserAdd2Line.svelte';
	let { me } = $derived(
		useAccount({
			resolve: {
				root: {
					myContacts: true
				}
			}
		})
	);
	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			resolve: {
				people: {
					$each: true
				},
				photos: true
			}
		})
	);

	// Extract list of people from global data
	let searchTerm = $state('');
	let listOfPeople = $derived(extractAllPeople(globalData).map((el) => el.value));
	let searchResults = $derived(
		searchTerm.length < 3
			? null
			: listOfPeople.filter((el) => el?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
	);
</script>

<NavBar><h3 class="text-lg font-bold">Contacts</h3></NavBar>
<main class="container mx-auto max-w-xl flex-1 px-4">
	<label class="label w-full flex-col"
		><div>Search for contacts</div>
		<input bind:value={searchTerm} class="input mb-4 w-full" />
	</label>
	{#if me?.root?.myContacts}
		<ul class="list bg-base-100 rounded-box shadow-md">
			{#each searchResults || me.root.myContacts.sorted as contact, i}
				<li class="list-row">
					<div>
						<Avatar image={contact?.avatar} userId={contact?.id} name={contact?.name} />
					</div>
					<a href="/profile/{contact?.id}"
						><div>
							<div>
								{contact?.name}
								{#if contact?.id === me?.profile?.id}(me){/if}
							</div>
							<div class="text-xs font-semibold uppercase opacity-60"></div>
						</div>
					</a>
					{#if me.root.myContacts.some((el) => el?.id === contact?.id)}
						<button
							class="btn btn-square btn-ghost"
							onclick={() => {
								me?.root?.myContacts?.splice(i, 1);
							}}
						>
							<MingcuteUserRemove2Line size={2} />
						</button>
					{:else}
						<button
							class="btn btn-square btn-ghost"
							onclick={() => {
								me?.root?.myContacts?.push(contact);
							}}
						>
							<MingcuteUserAdd2Line size={2} />
						</button>
					{/if}
				</li>
			{:else}
				<li class="list-row">No contacts found.</li>
			{/each}
		</ul>
	{/if}
</main>
