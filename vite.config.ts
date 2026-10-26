import adapter from './.config/cloudflare.adapter.ts';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
	// The browser test builds the pages from a fixed copy of the data, so its screenshots stay the
	// same when the data changes. That build leaves build/ to the real one.
	const screenshots = mode === 'screenshots';
	return {
		plugins: [
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/u).includes('node_modules') ? undefined : true
				},
				...(screenshots ? {} : { adapter: adapter() }),
				// 404.html is served at any depth, where relative asset paths would miss.
				paths: { relative: false }
			})
		],
		resolve: {
			alias: { $data: `${import.meta.dirname}/${screenshots ? 'browser/screenshot-data' : 'data'}` }
		},
		test: {
			include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']
		}
	};
});
