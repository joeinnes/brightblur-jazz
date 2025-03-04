<script lang="ts">
	import Avatar from './Avatar.svelte';

	import { FileStream } from 'jazz-tools';
	import { useAccount } from 'jazz-svelte';

	const { me, logOut } = useAccount();
	const myProfile = $derived(
		me.ensureLoaded({
			profile: {
				avatar: []
			}
		})
	);
</script>

<div class="navbar bg-base-100 mb-4 shadow-sm">
	<div class="flex-1">
		<a class="btn btn-ghost text-xl" href="/">BrightBlur</a>
	</div>
	<div class="flex-none">
		<div class="dropdown dropdown-end">
			<div role="button" tabindex="0" class="btn btn-ghost">
				<span>{me?.profile?.name}</span>
				<div class="circle avatar w-10 rounded-full">
					{#await myProfile then myProfile}
						<Avatar id={myProfile?.profile?.avatar?.id} name={myProfile.profile.name} />
					{/await}
				</div>
			</div>
			<ul class="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
				<li>
					<a class="justify-between" href="/profile/me"> Profile </a>
				</li>
				<!--<li><a>Settings</a></li>-->
				<li><button onclick={logOut}>Log Out</button></li>
			</ul>
		</div>
	</div>
</div>
