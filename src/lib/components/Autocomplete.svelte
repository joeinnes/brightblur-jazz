<script lang="ts">
	import { Group, type ID } from 'jazz-tools';
	import { BrightBlurProfile } from '$lib/schema';
	import UserPlus from 'lucide-svelte/icons/user-plus';
	import { imageDataToFile } from '$lib/utils/imageData.svelte';
	import Avatar from './Avatar.svelte';
	let {
		selectedItem = $bindable(),
		placeholder = '',
		items = [],
		imageData,
		people
	}: {
		selectedItem: ID<BrightBlurProfile> | null;
		placeholder: string;
		items: { label: string; value: ID<BrightBlurProfile> }[];
		imageData: ImageData;
		listOfPeople: any;
		people: any;
	} = $props();
	let value = $state('');
	let newPersonName = $state('');
	let addPersonModal = $state<HTMLDialogElement>();
	let filteredItems = $derived(
		value.length > 2
			? items.filter((item) => item.label.toLowerCase().includes(value.toLowerCase()))
			: []
	);

	const createNewPerson = () => {
		const personOwnershipGroup = Group.create();
		personOwnershipGroup.addMember('everyone', 'reader');
		const newProfile = BrightBlurProfile.create(
			{
				name: newPersonName
			},
			{ owner: personOwnershipGroup }
		);
		people.push(newProfile);
		selectedItem = newProfile.id;
	};
	const selectOption = ({ label, value: val }: { label: string; value: ID<BrightBlurProfile> }) => {
		value = label;
		selectedItem = val;
		(document.activeElement as HTMLElement).blur();
	};
</script>

<div class="dropdown w-full">
	<input
		class="input input-bordered join-item w-full"
		{placeholder}
		bind:value
		tabindex="0"
		onblur={() => {
			if (!selectedItem) value = '';
		}}
	/>

	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<ul
		tabindex="0"
		class="dropdown-content menu bg-base-100 rounded-box z-1 max-h-80 w-full flex-nowrap space-y-1 overflow-auto p-2 shadow"
	>
		{#each filteredItems as item}
			<li>
				<button
					type="button"
					class="btn btn-ghost rounded-box justify-start"
					onmousedown={() => selectOption(item)}
					ontouchstart={() => selectOption(item)}
				>
					{item.label}
				</button>
			</li>
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
					}}><UserPlus />Add {value}</button
				>
			</li>
		{:else}
			<li class="p-2">Type to search...</li>
		{/if}
	</ul>
</div>

<dialog class="modal" bind:this={addPersonModal} id="addPersonModal">
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
			<p class="py-4 text-sm opacity-60">
				When you tag a new person, you will be given the access to manage that profile as an admin.
				Once that person creates an account, you can transfer the profile to that person.
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
							newPersonName = '';
						}}>Add This Profile</button
					>
				</form>
			</div>
		</div>
	</div>
</dialog>
