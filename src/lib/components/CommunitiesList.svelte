<script lang="ts">
	import type { ListOfCommunities } from '$lib/schema';
	import Users from 'lucide-svelte/icons/users';
	import Avatar from './Avatar.svelte';

	let {
		communities
	}: {
		communities: ListOfCommunities | undefined | null;
	} = $props();
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
			<button class="btn btn-primary"><Users />Create a Community</button>
		</li>
	</ul>
</div>
