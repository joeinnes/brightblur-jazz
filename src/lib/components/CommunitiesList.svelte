<script lang="ts">
	import { Community, type ListOfCommunities } from '$lib/schema';
	import Avatar from './Avatar.svelte';
	import { Group } from 'jazz-tools';
	import toast from '@natoune/svelte-daisyui-toast';
	import { useAccount } from 'jazz-svelte';
	import MingcuteGroup3Line from '../../icons/MingcuteGroup3Line.svelte';

	let {
		communities
	}: {
		communities: ListOfCommunities | undefined | null;
	} = $props();

	let creationModal: HTMLDialogElement | undefined = $state();
	let name = $state('');
	let description = $state('');
	const createCommunity = () => {
		const communityOwnerGroup = Group.create();
		const community = Community.create(
			{
				name,
				description
			},
			{
				owner: communityOwnerGroup
			}
		);
		name = '';
		description = '';
		toast.success('Community created! You can now start inviting others to your new community.', {
			duration: 3000
		});
		communities?.push(community);
	};
</script>

<div class="tab-content p-4">
	<ul class="list bg-base-100 rounded-box shadow-md">
		{#each communities || [] as community}
			{#if community}
				<li>
					<a href={`/community/${community.id}`} class="list-row">
						<div class="mb-2 flex items-center gap-2">
							<Avatar userId={community.id} image={community.image} name={community.name} />
							<span>{community.name}</span>
						</div>
					</a>
				</li>
			{/if}
		{:else}
			<li class="list-row">You aren't a member of any communities.</li>
		{/each}
		<li class="list-row">
			<button
				class="btn btn-primary btn-block col-span-2"
				onclick={() => creationModal?.showModal()}
				><MingcuteGroup3Line size={1.5} />Create a Community</button
			>
		</li>
	</ul>
</div>

<dialog bind:this={creationModal} class="modal">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Create A Community</h3>
		<label class="mb-4"
			>Name <br />
			<input
				type="text"
				bind:value={name}
				required
				placeholder="My Community"
				class="input mb-2"
			/></label
		><label
			>Description<br />
			<textarea bind:value={description} required placeholder="This is my community." class="input"
			></textarea></label
		>

		<div class="modal-action">
			<form method="dialog">
				<!-- if there is a button in form, it will close the modal -->
				<button
					class="btn"
					onclick={() => {
						name = '';
						description = '';
						creationModal?.close();
					}}>Cancel</button
				>
				<button class="btn btn-primary" onclick={createCommunity}>Save</button>
			</form>
		</div>
	</div>
</dialog>
