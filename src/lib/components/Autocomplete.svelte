<script lang="ts">
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import { Group, type ID } from 'jazz-tools';
	import { useAccount, useCoState } from 'jazz-svelte';

	import { BrightBlurProfile, GlobalData } from '$lib/schema';

	import { imageDataToFile } from '$lib/utils/imageData.svelte';
	import { extractAllPeople } from '$lib/utils/profileUtils';

	import MingcuteUserAdd2Line from '../../icons/MingcuteUserAdd2Line.svelte';
	import Avatar from './Avatar.svelte';

	// Component state
	let value = $state('');
	let newPersonName = $state('');
	let addPersonModal = $state<HTMLDialogElement>();
	let definitelyNew = $state(false);

	// Props
	let {
		selectedPerson = null,
		placeholder = '',
		imageData,
		updateSelectedPerson = () => {}
	}: {
		selectedPerson: BrightBlurProfile | null;
		placeholder: string;
		imageData: ImageData;
		updateSelectedPerson: (person: BrightBlurProfile | null) => void;
	} = $props();

	// Derived State
	let { me } = $derived(
		useAccount({
			resolve: {
				profile: true,
				root: {
					myContacts: true
				}
			}
		})
	);
	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			resolve: {
				people: true,
				photos: true
			}
		})
	);
	let listOfPeople = $derived(extractAllPeople(globalData));
	let searchResults = $derived(
		listOfPeople
			.map((el) => el.value)
			.filter((el) => {
				return el?.name.toLowerCase().includes(newPersonName.toLowerCase());
			})
			.sort((a, b) => a?.name?.localeCompare(b?.name))
	);
	let taggablePeople = $derived([me?.profile, ...(me?.root?.myContacts || [])]);
	let filteredItems = $derived(
		value.length > 2
			? taggablePeople
					.filter((item) => item?.name.toLowerCase().includes(value.toLowerCase()))
					.sort((a, b) =>
						a?.name === undefined || b?.name === undefined ? 0 : a?.name?.localeCompare(b?.name)
					)
			: []
	);

	// Event Handlers
	function selectOption(item: BrightBlurProfile) {
		value = item.name;
		updateSelectedPerson(item);
		(document.activeElement as HTMLElement).blur();
	}

	function createNewPerson() {
		const personOwnershipGroup = Group.create();
		personOwnershipGroup.addMember('everyone', 'reader');
		const newProfile = BrightBlurProfile.create(
			{
				name: newPersonName
			},
			{ owner: personOwnershipGroup }
		);
		globalData?.current?.people?.push(newProfile);
		me?.root.myContacts.push(newProfile);
		updateSelectedPerson(newProfile);
	}
	$effect(() => {
		if (selectedPerson) {
			value = selectedPerson?.name || '';
		} else {
			value = '';
		}
	});
</script>

<div class="dropdown w-full">
	<input
		class="input input-bordered join-item w-full"
		{placeholder}
		bind:value
		tabindex="0"
		onblur={() => {
			if (!selectedPerson) value = '';
		}}
	/>

	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<ul
		tabindex="0"
		class="dropdown-content menu bg-base-100 rounded-box z-1 max-h-80 w-full flex-nowrap space-y-1 overflow-auto p-2 shadow"
	>
		{#each filteredItems || [] as item}
			{#if item}
				<li>
					<button
						type="button"
						class="btn btn-ghost rounded-box justify-start"
						onmousedown={() => selectOption(item)}
						ontouchstart={() => selectOption(item)}
						><Avatar image={item?.avatar} name={item?.name} userId={item?.id} />
						{item.name}{#if item?.id === me?.profile.id}
							&nbsp;(me){/if}
					</button>
				</li>
			{/if}
		{/each}
		{#if value.length > 2}
			<li>
				<button
					type="button"
					class="btn btn-primary rounded-box"
					onmousedown={(e) => {
						e.preventDefault();
						newPersonName = value;
						addPersonModal?.showModal();
					}}><MingcuteUserAdd2Line size={1.5} />Add {value}</button
				>
			</li>
		{:else}
			<li class="p-2">Type to search...</li>
		{/if}
	</ul>
</div>

<dialog
	class="modal"
	bind:this={addPersonModal}
	id="addPersonModal"
	onclose={() => {
		newPersonName = '';
		definitelyNew = false;
	}}
>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Who is this?</h3>
		<div>
			{#await imageDataToFile(imageData) then imageFile}
				{@const url = URL.createObjectURL(imageFile)}<img
					class="rounded-box w-full"
					src={url}
					onload={() => URL.revokeObjectURL(url)}
					alt="Face of {newPersonName}"
				/>{/await}
			<div class="flex flex-1 flex-col">
				<label for="newPersonName" class="label">Name</label>
				<input
					type="text"
					bind:value={newPersonName}
					class="input rounded-box w-full"
					id="newPersonName"
				/>
			</div>
			{#if !definitelyNew && searchResults.length}
				<div>
					Before you create a new profile, did you mean any of these people? <ul
						class="list bg-base-100 rounded-box max-h-52 overflow-y-scroll shadow-md"
					>
						{#each searchResults as contact}
							{#if contact}
								<li class="list-row">
									<div>
										<Avatar image={contact?.avatar} userId={contact?.id} name={contact?.name} />
									</div>
									<div>
										<div>{contact?.name}</div>
										<div class="text-xs font-semibold uppercase opacity-60"></div>
									</div>

									<button
										class="btn btn-square btn-ghost"
										onclick={() => {
											me?.root?.myContacts?.push(contact);
										}}
									>
										<MingcuteUserAdd2Line size={2} />
									</button>
								</li>
							{/if}
						{/each}
					</ul>
				</div>
				<div class="modal-action">
					<form method="dialog">
						<button class="btn rounded-box">Close</button>
					</form>
					<form method="dialog">
						<!-- if there is a button in form, it will close the modal -->
						<button
							class="btn btn-primary rounded-box"
							onclick={() => {
								definitelyNew = true;
							}}>None of these people</button
						>
					</form>
				</div>
			{:else}
				<p class="py-4 text-sm opacity-60">
					When you tag a new person, you will be given the access to manage that profile as an
					admin. Once that person creates an account, you can transfer the profile to that person.
				</p>

				<div class="modal-action">
					<form method="dialog">
						<!-- if there is a button in form, it will close the modal -->
						<button class="btn rounded-box">Close</button>
					</form>
					<form method="dialog">
						<!-- if there is a button in form, it will close the modal -->
						<button
							class="btn btn-primary rounded-box"
							onclick={() => {
								createNewPerson();
							}}>Add This Profile</button
						>
					</form>
				</div>
			{/if}
		</div>
	</div>
</dialog>
