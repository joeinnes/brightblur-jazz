<script lang="ts">
	import { FileStream } from 'jazz-tools';

	let { managedPeople = [] } = $props();
</script>

<div class="tab-content p-4">
	<ul class="list bg-base-100 rounded-box shadow-md">
		{#each managedPeople as person}
			<li>
				<a href={`/profile/${person?.value?.id}`} class="list-row">
					<div class="mb-2 flex items-center gap-2">
						{#if person.value.avatar}
							{#await FileStream.loadAsBlob(person.value.avatar.id) then blob}
								{#if blob}
									{@const url = URL.createObjectURL(blob)}
									<img
										src={url}
										alt="Profile"
										class="border-primary size-10 rounded-full border-2 object-cover"
										onload={() => URL.revokeObjectURL(url)}
									/>
								{/if}
							{/await}
						{:else}
							<div
								class="border-primary bg-secondary text-secondary-content grid size-10 place-items-center rounded-full border-2"
							>
								{person.value?.name
									.split(' ')
									.map((el: string) => el[0])
									.join('')}
							</div>
						{/if}
						{person.value.name}
					</div>
				</a>
			</li>
		{:else}
			<li>You don't administer any other users.</li>
		{/each}
	</ul>
</div>
