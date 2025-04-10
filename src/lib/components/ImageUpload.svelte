<script lang="ts">
	import toast from '@natoune/svelte-daisyui-toast';

	import ImagePlus from 'lucide-svelte/icons/image-plus';
	import LoadingSpinner from 'lucide-svelte/icons/loader-pinwheel';
	import CropperModal from './CropperModal.svelte';

	let { readyState, croppedBlob = $bindable() } = $props();
	let imageAspect: number | undefined = $state();
	let originalFile: File | undefined = $state();
	let cropperModal: HTMLDialogElement | undefined = $state();

	const handleFileSelect = (e: Event & { currentTarget: HTMLInputElement }) => {
		try {
			const input = e.currentTarget;
			if (!input.files || !input.files[0]) throw new Error('No file selected.');

			originalFile = input.files[0];

			// Calculate aspect ratio from the original image
			const img = document.createElement('img');
			const url = URL.createObjectURL(input.files[0]);

			img.onload = () => {
				imageAspect = img.width / img.height;
				URL.revokeObjectURL(url);
				cropperModal?.showModal();
			};

			img.onerror = () => {
				URL.revokeObjectURL(url);
				imageAspect = undefined;
				cropperModal?.show();
			};

			img.src = url;
		} catch (e: unknown) {
			if (e instanceof Error) {
				toast.error(e.message, { duration: 3000 });
			}
		}
	};
</script>

<label for="picture" class="cursor-pointer">
	<div class="grid w-full items-center gap-1.5">
		<div class="bg-primary-content text-primary rounded-2xl p-4">
			<div
				class="border-primary flex aspect-square w-full flex-col items-center justify-center gap-5 border-8 border-dashed"
			>
				<div class={(readyState === 'working' && 'animate-spin') || ''}>
					{#if readyState === 'working'}
						<LoadingSpinner class="h-[25dvw] w-[25dvw]" />
					{:else}
						<ImagePlus class="h-[25dvw] w-[25dvw]" />
					{/if}
				</div>
			</div>
		</div>
		<input id="picture" type="file" onchange={handleFileSelect} accept="image/*" class="hidden" />
	</div>
</label>

<CropperModal {imageAspect} bind:cropperModal {originalFile} bind:croppedBlob bind:readyState />
