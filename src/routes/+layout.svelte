<script lang="ts" module>
	declare module 'jazz-svelte' {
		interface Register {
			Account: BrightBlurAccount;
		}
	}
</script>

<script lang="ts">
	import type { SyncConfig } from 'jazz-tools';
	import '../app.css';

	import { JazzProvider } from 'jazz-svelte';
	import Auth from '$lib/components/Auth.svelte';

	let { children } = $props();
	import { BrightBlurAccount } from '$lib/schema';
	let sync: SyncConfig = {
		peer: 'wss://cloud.jazz.tools/?key=brightblur@joeinn.es',
		when: 'never'
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
