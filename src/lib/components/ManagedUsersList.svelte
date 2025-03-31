<script lang="ts">
	import Avatar from './Avatar.svelte';

	let { managedPeople = [] } = $props();
</script>

<div class="tab-content p-4">
	<ul class="list bg-base-100 rounded-box shadow-md">
		{#each managedPeople as person}
			<li>
				<a href={`/profile/${person?.value?.id}`} class="list-row">
					<div class="mb-2 flex items-center gap-2">
						<Avatar image={person.value.avatar} userId={person.value.id} />
						{person.value.name}
					</div>
				</a>
			</li>
		{:else}
			<li class="list-row">You don't administer any other users.</li>
		{/each}
	</ul>
</div>
