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
	ignoreFiles: ['../src/styles/tokens.css'],
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

		// Colors, lengths, durations, easings, opacities and type come from tokens.
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
			'color',
			'cubic-bezier'
		],
		// Media queries can't read custom properties, so breakpoints stay in px.
		'unit-disallowed-list': [['px', 'rem'], { ignoreMediaFeatureNames: { px: ['width'] } }],
		// Unlike declaration-strict-value, this also sees lengths inside calc(), min() and max().
		'declaration-property-unit-allowed-list': {
			'/^(margin|padding)|gap$|radius$|^(font-size|letter-spacing)$/': ['%']
		},
		// Weights, line heights and opacities are often unitless, so the unit rules can't see them.
		'scale-unlimited/declaration-strict-value': [
			['font-weight', 'line-height', 'opacity'],
			{
				ignoreValues: { 'font-weight': 'inherit', 'line-height': 'inherit', opacity: ['0', '1'] },
				ignoreAtRules: ['@font-face']
			}
		],
		// No primitives and no literal durations. The space, radius and stroke steps are named by value
		// and alias one size each in every mode, so they count as primitives too. A 0s delay is fine.
		'declaration-property-value-disallowed-list': [
			{
				'/.*/': [
					/var\(\s*--(?:(?:neutral|amber|gray|green|indigo|lavender|lime|mix|orange|pink|red|violet|size|font|space|radius|stroke)-|opacity-\d)/u,
					/(?<![\w.-])-?(?=[\d.]*[1-9])\d*\.?\d+m?s\b/u
				]
			},
			{ message: 'Use a semantic or component token, not a primitive one or a literal duration' }
		]
	}
} satisfies Config;
