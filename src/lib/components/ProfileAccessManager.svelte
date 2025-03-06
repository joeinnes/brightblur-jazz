<script lang="ts">
	import { Group } from 'jazz-tools';
	import { useCoState } from 'jazz-svelte';
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
		profile.current?._owner
			?.castAs?.(Group)
			?.members.filter((member: { role: 'admin' | 'reader' | 'writer' }) => member.role === 'admin')
			.length
	);
</script>

<div class="tab-content p-4">
	<ul class="list bg-base-100 rounded-box shadow-md">
		{#each profile.current?._owner?.castAs?.(Group)?.members || [] as member}
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
									disabled={member.id === currentlyViewing.current?.user?.id ||
										(countAdmins < 2 && member.role === 'admin')}
									onclick={(e) => {
										e.stopPropagation();
										profile.current?._owner?.castAs?.(Group).removeMember(member.account);
									}}
								>
									<UserRoundX />
								</button>
								{#if member.role === 'admin'}
									<button
										class="btn btn-square btn-ghost"
										disabled={member.id === currentlyViewing.current?.user?.id || countAdmins < 2}
										onclick={(e) => {
											e.stopPropagation();
											const group = profile.current?._owner?.castAs?.(Group);
											if (!group) return;
											group.removeMember(member.account);
											group.addMember(member.account, 'reader');
										}}
									>
										<ShieldOff />
									</button>
								{:else}
									<button
										class="btn btn-square btn-ghost"
										disabled={member.id === currentlyViewing.current?.user?.id}
										onclick={(e) => {
											e.stopPropagation();
											const group = profile.current?._owner?.castAs?.(Group);
											if (!group) return;
											group.removeMember(member.account);
											group.addMember(member.account, 'admin');
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
