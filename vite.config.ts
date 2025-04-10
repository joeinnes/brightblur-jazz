import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		tailwindcss(),
		SvelteKitPWA({
			devOptions: {
				enabled: false
			}
		})
	],
	optimizeDeps: {
		include: ['face-api.js']
	},
	ssr: {
		noExternal: ['face-api.js']
	}
});
