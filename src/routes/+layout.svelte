<script lang="ts" module>
	declare module 'jazz-svelte' {
		interface Register {
			Account: BrightBlurAccount;
		}
	}
</script>

<script lang="ts">
	import 'jazz-inspector-element';
	import { onNavigate } from '$app/navigation';

	import { JazzProvider } from 'jazz-svelte';
	import type { SyncConfig } from 'jazz-tools';
	import { PUBLIC_SYNC_SERVER, PUBLIC_API_KEY } from '$env/static/public';
	import { Toaster } from '@natoune/svelte-daisyui-toast';
	import { BrightBlurAccount } from '$lib/schema';
	import Auth from '$lib/components/Auth.svelte';
	import '../app.css';
	let { children } = $props();
	const syncServer = PUBLIC_SYNC_SERVER as `wss://${string}` | `ws://${string}`;

	let sync: SyncConfig = {
		peer: `${syncServer}/?key=${PUBLIC_API_KEY}`,
		when: 'signedUp'
	};
	let AccountSchema = BrightBlurAccount;

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
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
<jazz-inspector> </jazz-inspector>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}

	@keyframes fade-out {
		to {
			opacity: 0;
		}
	}

	@keyframes slide-from-right {
		from {
			transform: translateX(30px);
		}
	}

	@keyframes slide-to-left {
		to {
			transform: translateX(-30px);
		}
	}

	:root::view-transition-old(root) {
		animation:
			90ms cubic-bezier(0.4, 0, 1, 1) both fade-out,
			300ms cubic-bezier(0.4, 0, 0.2, 1) both slide-to-left;
	}

	:root::view-transition-new(root) {
		animation:
			210ms cubic-bezier(0, 0, 0.2, 1) 90ms both fade-in,
			300ms cubic-bezier(0.4, 0, 0.2, 1) both slide-from-right;
	}
</style>
