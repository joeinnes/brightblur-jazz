<script lang="ts">
	import { Account, Group } from 'jazz-tools';
	import { useAccount, useCoState } from 'jazz-svelte';
	import toast from '@natoune/svelte-daisyui-toast';

	import { BrightBlurAccount, BrightBlurProfile } from '$lib/schema';
	import { formatRole } from '$lib/utils/profileUtils';
	import UserRoundX from 'lucide-svelte/icons/user-round-minus';
	import ShieldOff from 'lucide-svelte/icons/shield-off';
	import ShieldPlus from 'lucide-svelte/icons/shield-plus';
	import Avatar from './Avatar.svelte';

	let { profile } = $props();
	let currentlyViewing = $derived(
		useCoState(BrightBlurProfile, profile.current.id, {
			user: {}
		})
	);

	let countAdmins = $derived(
		currentlyViewing?.current?._owner
			?.castAs?.(Group)
			?.members.filter((member) => member.role === 'admin').length || 0
	);

	let { me } = useAccount();
</script>

<div class="tab-content p-4">
	<ul class="list bg-base-100 rounded-box shadow-md">
		{#each currentlyViewing.current?._owner?.castAs?.(Group)?.members || [] as member}
			{#await BrightBlurAccount.load(member.id, { profile: { avatar: [] } }) then person}
				{#if person}
					<li>
						<a href="/profile/{person?.profile?.id}" class="list-row">
							<Avatar id={person?.profile?.avatar?.id} name={person?.profile?.name} />
							<div>
								<div>
									{person?.profile.name}
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
										? 'You cannot remove the last admin from this profile'
										: ''}
							>
								<button
									class="btn btn-square btn-ghost"
									disabled={member.id !== me?.id && member.role === 'admin'}
									onclick={async (e) => {
										e.preventDefault();
										e.stopPropagation();

										try {
											const account = await Account.load(member.account.id, {});
											if (!account) throw new Error("Couldn't find account.");
											await currentlyViewing.current?._owner?.castAs?.(Group).removeMember(account);
										} catch (e) {
											console.log(`That didn't work`, e);
										}
									}}
								>
									<UserRoundX />
								</button>
								{#if member.role === 'admin'}
									<button
										class="btn btn-square btn-ghost"
										disabled={true}
										onclick={async (e) => {
											e.preventDefault();
											e.stopPropagation();
											const group = currentlyViewing.current?._owner?.castAs?.(Group);
											if (!group) {
												toast.error('Something went wrong.', { duration: 3000 });
												throw new Error("Couldn't find group.");
											}
											await group.removeMember(member.account);
										}}
									>
										<ShieldOff />
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
												console.log("That didn't work", e);
											}
										}}
									>
										<ShieldPlus />
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
