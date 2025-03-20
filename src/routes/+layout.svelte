<script lang="ts" module>
	declare module 'jazz-svelte' {
		interface Register {
			Account: BrightBlurAccount;
		}
	}
</script>

<script lang="ts">
	import { JazzProvider, usePasskeyAuth } from 'jazz-svelte';
	import type { SyncConfig } from 'jazz-tools';
	import { PUBLIC_SYNC_SERVER, PUBLIC_API_KEY } from '$env/static/public';
	import { Toaster } from '@natoune/svelte-daisyui-toast';
	import { BrightBlurAccount } from '$lib/schema';
	import Auth from '$lib/components/Auth.svelte';
	import '../app.css';
	let { children } = $props();

	let sync: SyncConfig = {
		peer: `wss://${PUBLIC_SYNC_SERVER}/?key=${PUBLIC_API_KEY}`,
		when: 'signedUp'
	};
	let AccountSchema = BrightBlurAccount;
	let auth = usePasskeyAuth({ appName: 'BrightBlur' });
	let login = $state(false);
</script>

<svelte:head>
	<title>BrightBlur | Privacy-First Photo Sharing</title>
	<meta
		name="description"
		content="Share photos with confidence. BrightBlur uses on-device AI to protect privacy while letting you control who sees what."
	/>
</svelte:head>

<JazzProvider {sync} {AccountSchema}>
	<Auth>
		{@render children()}
	</Auth>
</JazzProvider>
<Toaster />
