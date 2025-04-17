<script>
	import MingcuteHome1Line from '../../icons/MingcuteHome1Line.svelte';
	import MingcuteCamera2AiFill from '../../icons/MingcuteCamera2AiFill.svelte';
	import MingcuteUser3Line from '../../icons/MingcuteUser3Line.svelte';
	import MingcuteContacts3Line from '../../icons/MingcuteContacts3Line.svelte';
	import MingcuteGroup3Line from '../../icons/MingcuteGroup3Line.svelte';
	import { page } from '$app/state';
	const {
		url: { pathname }
	} = $derived(page);
</script>

<footer class="dock z-40 text-4xl">
	<a href="/" class="dock-item" class:dock-active={pathname === '/'}>
		<div class="dock-content">
			<MingcuteHome1Line class="dock-icon" />
		</div>
	</a>

	<a href="/profile/me" class="dock-item" class:dock-active={pathname.startsWith('/profile')}>
		<div class="dock-content">
			<MingcuteUser3Line class="dock-icon" />
		</div>
	</a>

	<a href="/new" class="dock-item bg-primary text-primary-content rounded-box">
		<div class="dock-content">
			<MingcuteCamera2AiFill class="dock-icon" />
		</div>
	</a>

	<a href="/communities" class="dock-item" class:dock-active={pathname.startsWith('/communities')}>
		<div class="dock-content">
			<MingcuteGroup3Line class="dock-icon" />
		</div>
	</a>

	<a href="/contacts" class="dock-item" class:dock-active={pathname.startsWith('/contacts')}>
		<div class="dock-content">
			<MingcuteContacts3Line class="dock-icon" />
		</div>
	</a>
</footer>

<style lang="postcss">
	.dock-content {
		@apply flex flex-col items-center;
	}
</style>
