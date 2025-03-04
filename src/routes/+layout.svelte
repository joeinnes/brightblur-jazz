<script lang="ts" module>
	declare module 'jazz-svelte' {
		interface Register {
			Account: BrightBlurAccount;
		}
	}
</script>

<script lang="ts">
	import '../app.css';
	import type { SyncConfig } from 'jazz-tools';

	import { JazzProvider } from 'jazz-svelte';
	import { BrightBlurAccount } from '$lib/schema';

	import Auth from '$lib/components/Auth.svelte';

	let { children } = $props();

	let sync: SyncConfig = {
		peer: 'ws://localhost:4200',
		when: 'signedUp'
	};
	let AccountSchema = BrightBlurAccount;
</script>

<svelte:head>
	<title>BrightBlur</title>
</svelte:head>
<JazzProvider {sync} {AccountSchema}>
	<Auth>
		{@render children()}
	</Auth>
</JazzProvider>
