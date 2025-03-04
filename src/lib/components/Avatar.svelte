<script lang="ts">
	import { FileStream, type ID } from 'jazz-tools';

	const {
		id,
		name = '',
		style = 'size-10'
	}: {
		id: ID<FileStream> | undefined;
		name?: string;
		style?: `size-${number}`;
	} = $props();

	const sizeValue = $derived(parseInt(style.split('-')[1]) || 10);
	const fontSize = $derived(`${sizeValue * 0.1}rem`);
</script>

{#if id}
	{#await FileStream.loadAsBlob(id) then blob}
		{#if blob}
			<img
				src={URL.createObjectURL(blob)}
				alt="Profile"
				class="border-primary {style} rounded-full border-2 object-cover"
			/>
		{/if}
	{/await}
{:else}
	<div
		class="border-primary bg-secondary text-secondary-content grid {style} place-items-center rounded-full border-2"
		style={`font-size: ${fontSize}`}
	>
		{name
			.split(' ')
			.map((el: string) => el[0])
			.join('')}
	</div>
{/if}
