<script lang="ts">
	import { Account, Group } from 'jazz-tools';
	import { useCoState } from 'jazz-svelte';
	import toast from '@natoune/svelte-daisyui-toast';

	import { BrightBlurAccount, BrightBlurProfile } from '$lib/schema';
	import { formatRole } from '$lib/utils/profileUtils';
	import Avatar from './Avatar.svelte';
	import MingcuteUserRemove2Line from '../../icons/MingcuteUserRemove2Line.svelte';
	import MingcuteUserSecurityRemoveLine from '../../icons/MingcuteUserSecurityRemoveLine.svelte';
	import MingcuteUserSecurityLine from '../../icons/MingcuteUserSecurityLine.svelte';

	let { profile } = $props();
	let currentlyViewing = $derived(
		useCoState(BrightBlurProfile, profile.current.id, {
			resolve: { user: true }
		})
	);

	let countAdmins = $derived(
		currentlyViewing?.current?._owner
			?.castAs?.(Group)
			?.members.filter((member) => member.role === 'admin').length || 0
	);

	let ownerGroup = $derived(currentlyViewing.current?._owner?.castAs?.(Group));
	let people = $derived(
		ownerGroup?.members.map((member) => {
			return {
				...member,
				person: BrightBlurAccount.load(member.id, { resolve: { profile: { avatar: true } } })
			};
		})
	);
</script>

<div class="tab-content p-4">
	<ul class="list bg-base-100 rounded-box shadow-md">
		{#each people || [] as member}
			{#await member.person then person}
				{#if person}
					<li>
						<a href="/profile/{person?.profile?.id}" class="list-row">
							<Avatar
								image={person.profile.avatar}
								name={person.profile.name}
								userId={person.profile.id}
							/>
							<div>
								<div>
									{person.profile.name}
								</div>
								<div class="text-xs font-semibold uppercase opacity-60">
									{formatRole(member.role)}
								</div>
							</div>
							<div
								class="tooltip"
								data-tip={member.id === currentlyViewing.current?.user?.id
									? 'You cannot remove yourself from this profile'
									: countAdmins < 2 && member.role === 'admin'
										? "Can't remove last admin"
										: ''}
							>
								<button
									class="btn btn-square btn-ghost"
									disabled={(member.id === currentlyViewing.current?.user?.id &&
										member.role === 'admin') ||
										(countAdmins < 2 && member.role === 'admin')}
									onclick={async (e) => {
										e.preventDefault();
										e.stopPropagation();
										if (member.id === currentlyViewing.current?.user?.id) {
											throw new Error('You cannot remove yourself from this profile');
										} else if (countAdmins < 2 && member.role === 'admin') {
											throw new Error("Can't remove last admin");
										}
										try {
											//await ownerGroup?.addMember(member.account, 'writeOnly');
											alert('NOT WORKING YET');
											await currentlyViewing.current?._owner.removeMember(member.account);
										} catch (e) {
											console.error(`That didn't work`, e);
										}
									}}
								>
									<MingcuteUserRemove2Line size={2} />
								</button>
								{#if member.role === 'admin'}
									<button
										class="btn btn-square btn-ghost"
										disabled={true}
										onclick={async (e) => {
											e.preventDefault();
											e.stopPropagation();
											if (member.id === currentlyViewing.current?.user?.id) {
												throw new Error('You cannot remove yourself from this profile');
											} else if (countAdmins < 2 && member.role === 'admin') {
												throw new Error("Can't remove last admin");
											}
											const group = currentlyViewing.current?._owner?.castAs?.(Group);
											if (!group) {
												toast.error('Something went wrong.', { duration: 3000 });
												throw new Error("Couldn't find group.");
											}

											await group.removeMember(member.account);
										}}
									>
										<MingcuteUserSecurityRemoveLine size={2} />
									</button>
								{:else}
									<button
										class="btn btn-square btn-ghost"
										disabled={member.id === currentlyViewing.current?.user?.id}
										onclick={async (e) => {
											try {
												e.preventDefault();
												e.stopPropagation();
												const group = currentlyViewing.current?._owner?.castAs?.(Group);
												if (!group) {
													toast.error('Something went wrong.', { duration: 3000 });
													throw new Error("Couldn't find group.");
												}
												const account = await Account.load(member.account.id, {});
												if (!account) {
													toast.error('Something went wrong.', { duration: 3000 });
													throw new Error("Couldn't find account.");
												}
												group.addMember(account, 'admin');
											} catch (e) {
												console.error("That didn't work", e);
											}
										}}
									>
										<MingcuteUserSecurityLine size={2} />
									</button>
								{/if}
							</div>
						</a>
					</li>
				{/if}
			{/await}
		{:else}
			<li class="list-row">No one has access to view these photos.</li>
		{/each}
	</ul>
</div>
