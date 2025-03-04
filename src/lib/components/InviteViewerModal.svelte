<script lang="ts">
	import { useAccount, useCoState } from 'jazz-svelte';
	import { Group, type ID } from 'jazz-tools';
	import { BrightBlurAccount, GlobalData } from '$lib/schema';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import UserPlus from 'lucide-svelte/icons/user-plus';

	// Props
	let {
		profile,
		onInviteSuccess = () => {}
	}: {
		profile: any;
		onInviteSuccess?: () => void;
	} = $props();

	// Get current user account
	const { me } = useAccount();

	// State variables
	let searchValue = $state('');
	let inviteModal = $state<HTMLDialogElement>();
	let searchResults = $state<Array<{ account: any; person: any }>>([]);
	let errorMessage = $state('');

	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			people: [],
			photos: []
		})
	);

	let listOfPeople = $derived.by(() => {
		const allPeople = [];
		if (globalData?.current?.people) {
			for (const [_, entries] of Object.entries(globalData?.current?.people)) {
				for (const entry of entries.all) {
					allPeople.push(entry);
				}
			}
		}
		return allPeople;
	});
	// Add user to profile's access group
	const addUserAccess = async (account: BrightBlurAccount) => {
		if (!profile?.current?._owner) {
			errorMessage = 'Cannot add access: profile owner not available';
			console.log('error');
			return;
		}

		try {
			const ownerGroup = profile.current._owner.castAs(Group);
			ownerGroup.addMember(account, 'reader');
			console.log(profile.current, ownerGroup);

			// Clear search after successful add
			searchValue = '';
			searchResults = [];

			// Notify parent component
			onInviteSuccess();
		} catch (error) {
			console.error('Error adding user access:', error);
			errorMessage = 'Failed to add user access';
		}
	};

	// Open the modal
	const openModal = () => {
		searchValue = '';
		searchResults = [];
		errorMessage = '';
		inviteModal?.showModal();
	};
</script>

<button class="btn btn-primary" onclick={openModal}>
	<UserPlus size={18} />
	Invite A Viewer
</button>

<dialog class="modal" bind:this={inviteModal}>
	<div class="modal-box">
		<h3 class="mb-4 text-lg font-bold">Invite People to View Your Profile</h3>

		<div class="form-control">
			<div class="input-group">
				<div class="dropdown w-full">
					<input
						class="input input-bordered w-full"
						placeholder="Search"
						bind:value={searchValue}
						tabindex="0"
					/>

					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<ul
						tabindex="0"
						class="dropdown-content menu bg-base-100 rounded-box z-1 max-h-80 w-full flex-nowrap overflow-auto p-2 shadow"
					>
						{#each listOfPeople.filter((el) => el?.value?.name
								.toLowerCase()
								.includes(searchValue.toLowerCase())) as item}
							<li>
								<button
									type="button"
									onclick={() => {
										if (!item.value.user?.id) return;
										console.log('Adding');
										addUserAccess(item.value.user);
										(document.activeElement as HTMLElement).blur();
									}}
								>
									{item.value.name}
								</button>
							</li>
						{:else}
							<li><button>No matches</button></li>
						{/each}
					</ul>
				</div>
			</div>
		</div>

		{#if errorMessage}
			<div class="alert alert-error mt-4">
				<span>{errorMessage}</span>
			</div>
		{/if}

		<div class="modal-action">
			<form method="dialog">
				<button class="btn">Close</button>
			</form>
		</div>
	</div>
</dialog>
