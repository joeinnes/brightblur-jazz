<script lang="ts">
	import { cropImage, type CroppedAreaPixels } from '$lib/utils/cropUtils';
	import toast from '@natoune/svelte-daisyui-toast';
	import Cropper from 'svelte-easy-crop';

	let {
		imageAspect,
		cropperModal = $bindable(),
		originalFile,
		croppedBlob = $bindable()
	} = $props();

	let cropInstance: Cropper | undefined = $state();
	let croppedAreaPixels: CroppedAreaPixels = $state({
		x: 0,
		y: 0,
		width: 0,
		height: 0
	});

	// Handle crop completion
	const handleCropComplete = async () => {
		try {
			if (!originalFile) throw new Error('Something went wrong.');
			croppedBlob = await cropImage(originalFile, croppedAreaPixels);
			cropperModal?.close();
		} catch (e: unknown) {
			console.error('Error cropping image:', e);
			if (e instanceof Error) toast.error(e.message, { duration: 3000 });
		}
	};
</script>

<!-- Cropper Modal -->
<dialog class="modal w-full" bind:this={cropperModal}>
	<div class="modal-box flex flex-col items-center">
		<!-- flex h-[100dvh] w-full max-w-full flex-col items-center rounded-none p-0">-->
		<div class="relative w-full flex-1" style="aspect-ratio: {imageAspect}">
			<Cropper
				bind:this={cropInstance}
				image={originalFile ? URL.createObjectURL(originalFile) : undefined}
				aspect={imageAspect}
				oncropcomplete={(e) => (croppedAreaPixels = e.pixels)}
			/>
		</div>
		<div class="flex gap-2 bg-transparent py-4">
			<button type="button" class="btn btn-primary" onclick={handleCropComplete}> OK </button>
			<button
				type="button"
				class="btn btn-error"
				onclick={() => {
					originalFile = undefined;
					cropperModal?.close();
				}}
			>
				Cancel
			</button>
		</div>
	</div>
</dialog>
