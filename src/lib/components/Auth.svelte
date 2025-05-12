<script lang="ts">
	import type { Snippet } from 'svelte';
	import { usePasskeyAuth } from 'jazz-svelte';
	import { Account } from 'jazz-tools';
	import toast from '@natoune/svelte-daisyui-toast';
	import Unauthed from './Unauthed.svelte';

	let { children }: { children?: Snippet } = $props();

	const auth = usePasskeyAuth({ appName: 'BrightBlur' });

	let error = $state<string | undefined>(undefined);
	let login = $state<boolean>(false);

	async function signUp(e: Event) {
		const formData = new FormData(e.currentTarget as HTMLFormElement);
		const name = formData.get('name') as string;

		if (!name) {
			error = 'Name is required';
			toast.error('You did not provide a name', { duration: 3000 });
			return null;
		}
		e.preventDefault();
		error = undefined;
		auth.current
			.signUp(name)
			.then(async () => {
				const me = Account.getMe();
				await me.ensureLoaded({
					resolve: {
						profile: true
					}
				});
				if (me?.profile) {
					me.profile.name = name;
				}
			})
			.catch((e) => {
				console.error(e);
				error = e.message;
				toast.error('There was an issue creating your account.', { duration: 3000 });
			});
	}

	function logIn(e: Event) {
		error = undefined;
		e.preventDefault();
		e.stopPropagation();
		auth.current.logIn().catch((e) => {
			console.error(e);
			error = e.message;
			toast.error('There was an error when trying to log you in.', { duration: 3000 });
		});
	}
</script>

{#if auth.state === 'anonymous' && login}
	<section>
		<div class="lg:grid lg:min-h-screen lg:grid-cols-12">
			<aside
				class="relative block h-16 overflow-hidden lg:order-last lg:col-span-5 lg:h-full xl:col-span-6"
			>
				<img
					src="/demo/unblurred.jpg"
					alt="Unblurred example"
					class="h-screen w-full object-cover"
				/>
				<img
					src="/demo/blurred.jpg"
					alt="Blurred example"
					class="blurred-image absolute inset-0 h-screen w-full object-cover transition-opacity duration-500 group-hover:opacity-0"
				/>
			</aside>

			<main
				class="flex items-center justify-center px-8 py-8 sm:px-12 lg:col-span-7 lg:px-16 lg:py-12 xl:col-span-6"
			>
				<div class="max-w-xl lg:max-w-3xl">
					<a class="text-primary-600 block" href="/">
						<span class="sr-only">Home</span>
						<img class="size-24" src="/favicon.svg" alt="Logo" />
					</a>

					<h1 class="mt-6 text-2xl font-black sm:text-3xl md:text-4xl">Welcome to BrightBlur</h1>

					<p class="mt-4 leading-relaxed opacity-60">
						Sign in to start securely sharing your favourite photos with your favourite people.
					</p>

					<form onsubmit={signUp} class="mt-8 grid grid-cols-6 gap-6">
						<fieldset class="fieldset col-span-6">
							<legend class="fieldset-legend">Name</legend>
							<input type="text" id="name" name="name" class="input w-full" />
						</fieldset>

						<div class="col-span-6 sm:flex sm:items-center sm:gap-4">
							<input type="submit" value="Create an account" class="btn btn-primary" />

							<p class="mt-4 text-sm opacity-60 sm:mt-0">
								Already have an account?
								<button onclick={logIn} class="link">Log in</button>.
							</p>
						</div>
					</form>
				</div>
			</main>
		</div>
	</section>
{:else if auth.state === 'anonymous' && !login}
	<Unauthed bind:login />
{:else}
	{@render children?.()}
{/if}

<style>
	.blurred-image {
		animation: pulse-opacity 3s infinite ease-in-out;
	}

	@keyframes pulse-opacity {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}
</style>
