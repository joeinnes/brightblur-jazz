<script lang="ts">
	import Avatar from './Avatar.svelte';
	import { useAccount } from 'jazz-svelte';

	let { children }: { children?: any } = $props();
	const { me, logOut } = $derived(
		useAccount({
			resolve: {
				profile: {
					avatar: true
				}
			}
		})
	);
</script>

{#if children}
	<div class="navbar bg-base-100 sticky top-0 z-50 mb-2 gap-2 px-4">
		<div class="navbar-start">
			<button
				class="btn btn-circle btn-ghost flex items-center text-2xl font-bold"
				onclick={() => {
					window.history.back();
					window.scrollTo(0, 0);
				}}>&larr;</button
			>
		</div>
		<div class="navbar-center px-2">
			{@render children()}
		</div>
		<div class="navbar-end"></div>
	</div>{:else}
	<div class="navbar bg-base-100 sticky top-0 z-50 mb-2 px-4">
		<div class="flex-1">
			<a class="flex items-center gap-1 text-2xl font-bold" href="/"
				><img src="/bb-b-brand.svg" alt="Logo" class="mr-1 h-12 w-12" />BrightBlur</a
			>
		</div>
		<div class="flex-none">
			<div class="dropdown dropdown-end">
				<div role="button" tabindex="0" class="">
					<div class="circle avatar w-12 rounded-full">
						<Avatar image={me?.profile?.avatar} name={me?.profile?.name} userId={me?.profile?.id} />
					</div>
				</div>
				<ul class="menu dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
					<li>
						<a class="justify-between" href="/profile/me"> Profile </a>
					</li>
					<!--<li><a>Settings</a></li>-->
					<li><button onclick={logOut}>Log Out</button></li>
				</ul>
			</div>
		</div>
	</div>
{/if}
