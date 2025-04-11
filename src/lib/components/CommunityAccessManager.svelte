<script lang="ts">
	import { Account, Group } from 'jazz-tools';
	import toast from '@natoune/svelte-daisyui-toast';

	import { BrightBlurAccount, Community } from '$lib/schema';
	import { formatRole } from '$lib/utils/profileUtils';
	import Avatar from './Avatar.svelte';
	import MingcuteUserRemove2Line from '../../icons/MingcuteUserRemove2Line.svelte';
	import MingcuteUserSecurityLine from '../../icons/MingcuteUserSecurityLine.svelte';
	import MingcuteUserSecurityRemoveLine from '../../icons/MingcuteUserSecurityRemoveLine.svelte';

	let {
		community,
		admin = false
	}: {
		community: {
			current: Community | null | undefined;
		};
		admin: boolean;
	} = $props();

	let countAdmins = $derived(
		community.current?._owner?.castAs?.(Group)?.members.filter((member) => member.role === 'admin')
			.length || 0
	);

	let people = $derived(
		community.current?._owner?.castAs?.(Group)?.members.map((member) => {
			return {
				...member,
				person: BrightBlurAccount.load(member.id, { resolve: { profile: { avatar: true } } })
			};
		})
	);
</script>

<div class="tab-content py-4">
	{#if community && people}
		<ul class="list bg-base-100 rounded-box shadow-md">
			{#each people as member}
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
								{#if admin}
									<div>
										<button
											class="btn btn-square btn-ghost tooltip"
											disabled={countAdmins < 2 && member.role === 'admin'}
											data-tip={countAdmins < 2 && member.role === 'admin'
												? 'You cannot remove the last admin from this profile'
												: ''}
											onclick={async (e) => {
												e.preventDefault();
												e.stopPropagation();
												if (countAdmins < 2 && member.role === 'admin') {
													throw new Error('You cannot remove the last admin from this profile');
												}
												try {
													const account = await Account.load(member.account.id, {});
													if (!account) throw new Error("Couldn't find account.");

													await community.current?._owner?.castAs?.(Group).removeMember(account);
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

													if (countAdmins < 2 && member.role === 'admin') {
														throw new Error('You cannot remove the last admin from this profile');
													}
													const group = community.current?._owner?.castAs?.(Group);
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
												onclick={async (e) => {
													try {
														e.preventDefault();
														e.stopPropagation();
														const group = community.current?._owner?.castAs?.(Group);
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
								{/if}
							</a>
						</li>
					{/if}
				{/await}
			{:else}
				<li class="list-row">No one has access to view these photos.</li>
			{/each}
		</ul>
	{/if}
</div>
