import { defineConfig } from 'oxlint';

export default defineConfig({
	options: {
		typeAware: true,
		denyWarnings: true
	},
	plugins: ['typescript', 'unicorn', 'oxc', 'import', 'promise', 'vitest'],
	categories: {
		correctness: 'error',
		suspicious: 'error',
		perf: 'error',
		pedantic: 'error'
	},
	rules: {
		// Demands deep readonly on every parameter, library types included.
		'typescript/prefer-readonly-parameter-types': 'off',
		// Effect's idiom names a schema and its type the same (const Entry, type Entry).
		'eslint/no-redeclare': 'off',
		// Exhaustive switches over a union return on every path; TypeScript already checks it.
		'typescript/consistent-return': 'off',
		'vitest/no-standalone-expect': ['error', { additionalTestBlockFunctions: ['it.effect'] }]
	},
	overrides: [
		{
			files: ['**/*.test.ts'],
			rules: {
				// A describe block groups many short tests.
				'eslint/max-lines-per-function': 'off'
			}
		}
	],
	env: {
		builtin: true
	}
});
