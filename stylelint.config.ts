import type { Config } from 'stylelint';

export default {
	ignoreFiles: ['src/styles/tokens.css'],
	overrides: [{ files: ['**/*.svelte'], customSyntax: 'postcss-html' }],
	rules: {
		// The space, radius and stroke steps are named by value and alias one size each in every mode,
		// so they count as primitives too.
		'declaration-property-value-disallowed-list': [
			{
				'/.*/': [
					/var\(\s*--(?:(?:neutral|amber|gray|green|indigo|lavender|lime|mix|orange|pink|red|violet|size|font|space|radius|stroke)-|opacity-\d)/u
				]
			},
			{ message: 'Use a semantic or component token, not a primitive one' }
		]
	}
} satisfies Config;
