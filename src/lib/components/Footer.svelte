<script>
	import MingcuteHome1Line from '../../icons/MingcuteHome1Line.svelte';
	import MingcuteCamera2AiFill from '../../icons/MingcuteCamera2AiFill.svelte';
	import MingcuteUser3Line from '../../icons/MingcuteUser3Line.svelte';
	import MingcuteContacts3Line from '../../icons/MingcuteContacts3Line.svelte';
	import MingcuteGroup3Line from '../../icons/MingcuteGroup3Line.svelte';
</script>

<footer class="dock z-40 text-4xl">
	<a href="/" class="dock-item">
		<div class="dock-content">
			<MingcuteHome1Line class="dock-icon" />
		</div>
	</a>

	<a href="/profile/me" class="dock-item">
		<div class="dock-content">
			<MingcuteUser3Line class="dock-icon" />
		</div>
	</a>

	<a href="/new" class="dock-item bg-primary text-primary-content rounded-box">
		<div class="dock-content">
			<MingcuteCamera2AiFill class="dock-icon" />
		</div>
	</a>

	<a href="/communities" class="dock-item">
		<div class="dock-content">
			<MingcuteGroup3Line class="dock-icon" />
		</div>
	</a>

	<a href="/contacts" class="dock-item">
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
