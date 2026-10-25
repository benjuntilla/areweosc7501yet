import { defineConfig } from 'oxfmt';

export default defineConfig({
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	svelte: true,
	ignorePatterns: ['pnpm-lock.yaml']
});
