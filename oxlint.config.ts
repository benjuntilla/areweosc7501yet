import { defineConfig } from 'oxlint';

export default defineConfig({
	options: {
		typeAware: true,
		denyWarnings: true
	},
	jsPlugins: [{ name: 'eslint-js', specifier: 'oxlint-plugin-eslint' }],
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
			// The domain runs under plain Node in tests and scripts, so it can't lean on SvelteKit.
			files: ['src/lib/domain/**'],
			rules: {
				'eslint/no-restricted-imports': [
					'error',
					{
						patterns: [
							{
								group: ['$app', '$app/*', '$env/*', '$lib', '$lib/*', '$service-worker'],
								message:
									'src/lib/domain/ must not use SvelteKit aliases; import with a relative path.'
							},
							{
								group: ['svelte', 'svelte/*', '@sveltejs/*', '*.svelte'],
								message: 'src/lib/domain/ must not import Svelte or SvelteKit.'
							}
						]
					}
				]
			}
		},
		{
			// Scripts run through NodeRuntime.runMain, which wires up logging, errors and signals.
			files: ['scripts/*.ts', 'scripts/*/main.ts'],
			rules: {
				'eslint-js/no-restricted-syntax': [
					'error',
					{
						selector:
							// A call, either NodeRuntime.runMain(program) or program.pipe(NodeRuntime.runMain).
							"Program:not(:has(CallExpression[callee.object.name='NodeRuntime'][callee.property.name='runMain'], CallExpression > MemberExpression.arguments[object.name='NodeRuntime'][property.name='runMain']))",
						message: 'Run scripts with NodeRuntime.runMain.'
					}
				]
			}
		},
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
