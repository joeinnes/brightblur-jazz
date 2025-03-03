<script lang="ts">
	import { Group, type ID } from 'jazz-tools';
	import { GlobalData, Person } from '$lib/schema';
	import UserPlus from 'lucide-svelte/icons/user-plus';
	import { imageDataToFile } from '$lib/utils/imageData';
	import { useCoState } from 'jazz-svelte';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	let {
		selectedItem = $bindable(),
		placeholder = '',
		items = [],
		imageData,
		listOfPeople,
		people
	}: {
		selectedItem: ID<Person> | null;
		placeholder: string;
		items: { label: string; value: ID<Person> }[];
		imageData: ImageData;
		listOfPeople: any;
		people: any;
	} = $props();
	let value = $state('');
	let newPersonName = $state('');
	let addPersonModal = $state<HTMLDialogElement>();
	let filteredItems = $derived(
		items.filter((item) => item.label.toLowerCase().includes(value.toLowerCase()))
	);

	const createNewPerson = () => {
		const personOwnershipGroup = Group.create();
		personOwnershipGroup.addMember('everyone', 'reader');
		const newPerson = Person.create({
			name: newPersonName
		});
		people.push(newPerson); // Should never be the case that listOfPeople is null
		console.log(Object.values(listOfPeople));
	};
</script>

<div class="dropdown w-full">
	<input
		class="input input-bordered w-full"
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
		class="dropdown-content menu bg-base-100 rounded-box z-1 max-h-80 w-full flex-nowrap overflow-auto p-2 shadow"
	>
		{#each filteredItems as item}
			<li>
				<button
					type="button"
					onclick={() => {
						selectedItem = item.value;
						value = item.label;
						(document.activeElement as HTMLElement).blur();
					}}
				>
					{item.label}
				</button>
			</li>
		{:else}
			<li>
				<button
					type="button"
					class="btn btn-sm btn-secondary"
					onmousedown={(e) => {
						e.preventDefault();
						newPersonName = value;
						addPersonModal?.showModal();
					}}><UserPlus />Add {value}</button
				>
			</li>
		{/each}
	</ul>
</div>

<dialog class="modal" bind:this={addPersonModal} id="addPersonModal">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Who is this?</h3>
		<div class="flex items-center gap-2">
			{#await imageDataToFile(imageData) then imageFile}<img
					class="rounded-box size-20"
					src={URL.createObjectURL(imageFile)}
					alt="Face of {newPersonName}"
				/>{/await}
			<div class="flex flex-1 flex-col">
				<label for="newPersonName" class="label">Name</label>
				<input type="text" bind:value={newPersonName} class="input w-full" id="newPersonName" />
			</div>
		</div>
		<p class="py-4 text-sm opacity-60">
			When you tag a new person, you will be given the access to manage that person as an admin.
			Once that person creates an account, you can transfer the profile to that person.
		</p>
		<div class="modal-action">
			<form method="dialog">
				<!-- if there is a button in form, it will close the modal -->
				<button class="btn">Close</button>
			</form>
			<form method="dialog">
				<!-- if there is a button in form, it will close the modal -->
				<button
					class="btn btn-primary"
					onclick={() => {
						createNewPerson();
						newPersonName = '';
					}}>Add This Person</button
				>
			</form>
		</div>
	</div>
</dialog>
