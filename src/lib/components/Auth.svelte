<script lang="ts">
	import type { Snippet } from 'svelte';
	import { usePasskeyAuth } from 'jazz-svelte';
	import { Account } from 'jazz-tools';
	import toast from '@natoune/svelte-daisyui-toast';

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
	<section class="bg-white">
		<div class="lg:grid lg:min-h-screen lg:grid-cols-12">
			<aside class="relative block h-16 lg:order-last lg:col-span-5 lg:h-full xl:col-span-6">
				<img alt="" src="/rain.svg" class="absolute inset-0 h-full w-full object-cover" />
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
	<div class="bg-primary relative flex min-h-screen w-full overflow-hidden">
		<div
			class="text-primary-content z-10 flex max-w-xl flex-1 flex-col justify-center px-8 py-16 md:px-12 lg:py-24"
		>
			<h1 class="flex items-center pb-4 text-5xl font-black md:text-6xl lg:text-7xl xl:text-8xl">
				<img src="/bb-b-w.svg" class="mr-3 h-[1em]" alt="BrightBlur Logo" />BrightBlur
			</h1>

			<p class="mt-4 text-xl font-medium md:text-2xl">Share photos with confidence.</p>
			<p class="mt-2 text-lg opacity-90">
				Protect privacy with AI-powered face blurring and selective access control.
			</p>
			<button
				class="btn btn-lg btn-outline mt-8 w-fit border-2 text-lg font-bold transition-all hover:scale-105"
				onclick={() => (login = true)}>Get Started</button
			>
		</div>
		<div class="fadein group absolute top-0 right-0 h-full w-full md:w-3/5">
			<div
				class="from-primary pointer-events-none absolute inset-0 z-10 bg-gradient-to-r to-transparent"
			></div>
			<img src="/demo/unblurred.jpg" alt="Unblurred example" class="h-full w-full object-cover" />
			<img
				src="/demo/blurred.jpg"
				alt="Blurred example"
				class="blurred-image absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-0"
			/>
		</div>
	</div>

	<section class="container mx-auto my-16 px-6 text-center">
		<h2 class="text-3xl font-bold md:text-4xl">Your Photos, Your Privacy</h2>
		<p class="mx-auto mt-6 max-w-3xl text-lg">
			BrightBlur combines <span class="font-semibold">on-device AI</span> with
			<span class="font-semibold">end-to-end encryption</span> to detect and blur faces before upload.
			Only approved viewers can see the original images, giving you complete control over your visual
			privacy.
		</p>
	</section>

	<section class="container mx-auto my-16 grid gap-8 px-6 md:grid-cols-2 lg:gap-12">
		<div class="bg-base-200 rounded-xl p-8 shadow-lg transition-all hover:shadow-xl">
			<div
				class="bg-primary text-primary-content mb-4 flex h-12 w-12 items-center justify-center rounded-full"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path d="M12 2a5 5 0 0 0-5 5v2a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Z"></path><path
						d="M19 11a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1Z"
					></path><path d="M5 11a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H5Z"
					></path></svg
				>
			</div>
			<h3 class="text-2xl font-bold">On-Device AI</h3>
			<p class="mt-4">
				Our advanced face detection runs directly on your device. Your private photos never leave
				your control for processing—ensuring maximum privacy from the moment you upload.
			</p>
		</div>
		<div class="bg-base-200 rounded-xl p-8 shadow-lg transition-all hover:shadow-xl">
			<div
				class="bg-primary text-primary-content mb-4 flex h-12 w-12 items-center justify-center rounded-full"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path
						d="M7 11V7a5 5 0 0 1 10 0v4"
					></path></svg
				>
			</div>
			<h3 class="text-2xl font-bold">End-to-End Encryption</h3>
			<p class="mt-4">
				Your photos are encrypted before they touch our servers. Only you and your explicitly
				approved contacts can decrypt and view the unblurred versions of your images.
			</p>
		</div>
	</section>

	<section class="bg-base-200 py-16">
		<div class="container mx-auto px-6">
			<h2 class="text-center text-3xl font-bold md:text-4xl">How BrightBlur Works</h2>
			<div class="mt-12 grid gap-8 md:grid-cols-3">
				<div class="bg-base-100 rounded-xl p-6 shadow-md transition-all hover:shadow-lg">
					<div
						class="bg-primary text-primary-content mb-4 flex h-10 w-10 items-center justify-center rounded-full font-bold"
					>
						1
					</div>
					<h3 class="text-xl font-bold">Upload & Protect</h3>
					<p class="mt-3">
						Upload your photos and BrightBlur automatically detects and blurs faces using local AI
						technology, preserving privacy before anything leaves your device.
					</p>
				</div>
				<div class="bg-base-100 rounded-xl p-6 shadow-md transition-all hover:shadow-lg">
					<div
						class="bg-primary text-primary-content mb-4 flex h-10 w-10 items-center justify-center rounded-full font-bold"
					>
						2
					</div>
					<h3 class="text-xl font-bold">Manage Access</h3>
					<p class="mt-3">
						Control exactly who can see unblurred faces in your photos. Grant and revoke access at
						any time, maintaining complete control over your visual content.
					</p>
				</div>
				<div class="bg-base-100 rounded-xl p-6 shadow-md transition-all hover:shadow-lg">
					<div
						class="bg-primary text-primary-content mb-4 flex h-10 w-10 items-center justify-center rounded-full font-bold"
					>
						3
					</div>
					<h3 class="text-xl font-bold">Share Securely</h3>
					<p class="mt-3">
						Share your photos with confidence. Authorized viewers see the original images while
						everyone else sees only the blurred version—perfect for families, schools, and
						workplaces.
					</p>
				</div>
			</div>
		</div>
	</section>

	<section class="container mx-auto my-16 px-6 text-center">
		<h2 class="text-3xl font-bold md:text-4xl">Take Control of Your Visual Privacy</h2>
		<p class="mx-auto mt-6 max-w-2xl text-lg">
			Join thousands of privacy-conscious users who share memories without compromising security.
			BrightBlur gives you the tools to share photos on your terms.
		</p>
		<button class="btn btn-primary btn-lg mt-8 px-8 font-bold" onclick={() => (login = true)}>
			Get Started Now
		</button>
	</section>

	<footer class="bg-base-200 py-8">
		<div class="container mx-auto px-6 text-center">
			<p class="text-sm opacity-70">
				© {new Date().getFullYear()} BrightBlur. Privacy-first photo sharing.
			</p>
		</div>
	</footer>
{:else}
	{@render children?.()}
{/if}

<style>
	.fadein img {
		position: absolute;
		right: 0;
		height: 100%;
	}

	.blurred-image {
		animation: pulse-opacity 3s infinite ease-in-out;
	}

	.group:hover .blurred-image {
		animation: none;
		opacity: 0;
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

	@media (max-width: 768px) {
		.fadein img {
			object-position: 70% center;
		}
	}
</style>
