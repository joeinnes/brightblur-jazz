<script lang="ts">
	import { useCoState } from 'jazz-svelte';
	import { Account, Group, type ID } from 'jazz-tools';
	import toast from '@natoune/svelte-daisyui-toast';

	import { BrightBlurAccount, BrightBlurProfile, GlobalData } from '$lib/schema';
	import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
	import UserPlus from 'lucide-svelte/icons/user-plus';
	import { extractAllPeople } from '$lib/utils/profileUtils';

	// Props
	let {
		profile,
		onInviteSuccess = () => {
			toast.success('Added successfully!');
		}
	}: {
		profile: { current: BrightBlurProfile };
		onInviteSuccess?: () => void;
	} = $props();

	// State variables
	let searchValue = $state('');
	let inviteModal = $state<HTMLDialogElement>();
	let searchResults = $state<Array<{ account: any; person: any }>>([]);
	let errorMessage = $state('');

	const globalData = $derived(
		useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>, {
			resolve: {
				people: true,
				photos: true
			}
		})
	);

	let listOfPeople = $derived(extractAllPeople(globalData));
	let eligibleViewers = $derived(
		listOfPeople
			.filter(
				(el) =>
					!profile.current._owner
						.castAs(Group)
						.members.find((member) => member.id === el.value?.user?.id) &&
					el?.value?.user &&
					el?.value?.name.toLowerCase().includes(searchValue.toLowerCase())
			)
			.slice(0, searchValue.length < 3 ? 10 : Infinity)
	);
	// Add user to profile's access group
	const addUserAccess = async (accountId: ID<BrightBlurAccount>) => {
		try {
			if (!profile?.current?._owner) throw new Error("Couldn't find owner.");
			const ownerGroup = profile.current._owner.castAs(Group);
			const account = await Account.load(accountId, {});
			if (!account) throw new Error('Account not found');
			ownerGroup.addMember(account, 'reader');

			// Clear search after successful add
			searchValue = '';
			searchResults = [];

			// Notify parent component
			onInviteSuccess();
		} catch (error: any) {
			toast.error(error.message, { duration: 3000 });

			console.error('Error adding user access:', error);
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
		<h3 class="text-lg font-bold">Invite Viewer</h3>
		<p class="mb-4 opacity-60">
			Currently, invitations do <strong>not</strong> work retroactively.
		</p>

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
						{#each eligibleViewers as item}
							<li>
								<button
									type="button"
									onclick={() => {
										try {
											if (!item.value.user?.id) throw new Error('Something went wrong.');

											addUserAccess(item.value.user.id);
											(document.activeElement as HTMLElement).blur();
											inviteModal?.close();
										} catch (e: any) {
											toast.error(e.message, { duration: 3000 });
										}
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
