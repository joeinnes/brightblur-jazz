import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		tailwindcss(),
		SvelteKitPWA({
			strategies: 'generateSW',
			registerType: 'autoUpdate',
			devOptions: {
				enabled: true,
				suppressWarnings: true
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
				navigateFallback: '/'
			},
			manifest: {
				theme_color: '#8362cd',
				background_color: '#ffffff',
				icons: [
					{
						purpose: 'maskable',
						sizes: '512x512',
						src: '/icon512_maskable.png',
						type: 'image/png'
					},
					{
						purpose: 'any',
						sizes: '512x512',
						src: '/icon512_maskable.png',
						type: 'image/png'
					}
				],
				orientation: 'portrait',
				display: 'standalone',
				lang: 'en-GB',
				name: 'BrightBlur',
				short_name: 'BrightBlur',
				description:
					'With BrightBlur, you can share your photos with complete confidence. Effortlessly blur sensitive details while letting only your chosen recipients view the full image. Enjoy the freedom to share moments securely, knowing you control who sees what.',
				start_url: '/',
				id: 'com.traist.brightblur'
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
