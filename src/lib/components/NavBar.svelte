<script lang="ts">
	import Avatar from './Avatar.svelte';
	import { useAccount } from 'jazz-svelte';

	const { me, logOut } = $derived(useAccount());
</script>

<div class="navbar bg-base-100 sticky top-0 z-50 mb-4 shadow-sm">
	<div class="flex-1">
		<a class="flex items-center gap-1 text-xl font-black" href="/"
			><img src="/bb-b-brand.svg" alt="Logo" class="h-8 w-8" />BrightBlur</a
		>
	</div>
	<div class="flex-none">
		<div class="dropdown dropdown-end">
			<div role="button" tabindex="0" class="btn btn-ghost">
				<span>{me?.profile?.name}</span>
				<div class="circle avatar w-10 rounded-full">
					<Avatar id={me?.profile?.avatar?.id} name={me?.profile?.name} userId={me?.profile?.id} />
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
