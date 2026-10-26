import adapter from './.config/cloudflare.adapter.ts';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

const unbuilt = new Set(['/test', '/methodology', '/contribute', '/changes']);

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/u).includes('node_modules') ? undefined : true
			},

			adapter: adapter(),
			prerender: {
				// The nav links to pages that aren't built yet. Drop each one here as it lands.
				handleHttpError: ({ path, message }) => {
					if (!unbuilt.has(path)) throw new Error(message);
				}
			}
		})
	],
	test: {
		include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']
	}
});
