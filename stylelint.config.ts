import type { Config } from 'stylelint';

export default {
	extends: [
		'stylelint-config-standard',
		'stylelint-config-html/svelte',
		'stylelint-config-recess-order'
	],
	plugins: [
		'@double-great/stylelint-a11y',
		'stylelint-declaration-strict-value',
		'stylelint-plugin-use-baseline'
	],
	ignoreFiles: ['src/styles/tokens.css'],
	// The site is English only, so the layout rules can map physical properties and fix them.
	languageOptions: { directionality: { block: 'top-to-bottom', inline: 'left-to-right' } },
	reportDescriptionlessDisables: true,
	reportInvalidScopeDisables: true,
	reportNeedlessDisables: true,
	rules: {
		'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],
		'selector-max-id': 0,
		'selector-max-specificity': '0,3,1',

		'property-layout-mappings': 'flow-relative',
		'unit-layout-mappings': 'flow-relative',
		'value-keyword-layout-mappings': 'flow-relative',

		'a11y/no-outline-none': true,
		'plugin/use-baseline': [
			true,
			{ available: 'newly', ignoreProperties: { 'font-family': ['ui-monospace'] } }
		],

		// Colors, spacing, radii and type come from tokens.
		'color-no-hex': true,
		// A mask only reads alpha, so black there means opaque, not a color.
		'color-named': ['never', { ignoreProperties: ['/^mask/'] }],
		'function-disallowed-list': [
			'rgb',
			'rgba',
			'hsl',
			'hsla',
			'hwb',
			'lab',
			'lch',
			'oklab',
			'oklch',
			'color'
		],
		'scale-unlimited/declaration-strict-value': [
			[
				'/^(margin|padding)/',
				'/gap$/',
				'/radius$/',
				'font-size',
				'font-weight',
				'line-height',
				'letter-spacing'
			],
			{ ignoreValues: ['0', 'auto', 'inherit'], ignoreAtRules: ['@font-face'] }
		],
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
