<script>
	import Camera from 'lucide-svelte/icons/camera';
	import CircleUserRound from 'lucide-svelte/icons/circle-user-round';
	import House from 'lucide-svelte/icons/house';
</script>

<footer class="dock">
	<a href="/" class="dock-item">
		<div class="dock-content">
			<House class="dock-icon" />
			<span class="dock-label">Home</span>
		</div>
	</a>
	<a href="/new" class="dock-item bg-primary text-primary-content rounded-box">
		<div class="dock-content">
			<Camera class="dock-icon" />
			<span class="dock-label">New</span>
		</div>
	</a>
	<a href="/profile/me" class="dock-item">
		<div class="dock-content">
			<CircleUserRound class="dock-icon" />
			<span class="dock-label">Profile</span>
		</div>
	</a>
</footer>

<style lang="postcss">
	.dock-content {
		@apply flex flex-col items-center;
	}
</style>
