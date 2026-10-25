import adapter from './scripts/cloudflare-adapter.ts';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/u).includes('node_modules') ? undefined : true
			},

			adapter: adapter()
		})
	],
	test: {
		include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']
	}
});
