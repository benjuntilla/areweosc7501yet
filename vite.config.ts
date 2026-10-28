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
				// Hash mode writes the policy into each prerendered page as a meta tag, with the hashes
				// of SvelteKit's own inline scripts. The theme script in src/app.html comes before that
				// tag, so the policy doesn't apply to it. A meta tag can't carry frame-ancestors, so
				// static/_headers sends that one.
				csp: {
					mode: 'hash',
					directives: {
						'default-src': ['self'],
						// Svelte's style: directives render as style attributes.
						'style-src-attr': ['unsafe-inline'],
						// The rail's grain is an SVG data URI.
						'img-src': ['self', 'data:'],
						// Vite inlines the small arrow font as a data URI.
						'font-src': ['self', 'data:'],
						'object-src': ['none'],
						'base-uri': ['none'],
						'form-action': ['none']
					}
				},
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/u).includes('node_modules') ? undefined : true
				},
				...(screenshots ? {} : { adapter: adapter() })
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
