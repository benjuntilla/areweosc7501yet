import { defineConfig } from '@terrazzo/cli';
import css from '@terrazzo/plugin-css';
import { Option, Schema } from 'effect';

// Mode blocks carry only the collection that has the mode, so devtools shows each alias chain once.
const semantic = [
	'color.**',
	'effect.**',
	'state.**',
	'code.**',
	'gradient.**',
	'canvas.**',
	'browser.**'
];
const responsive = [
	'space.**',
	'radius.**',
	'stroke.**',
	'layout.**',
	'type.**',
	'opacity.hidden',
	'opacity.hover',
	'opacity.subtle',
	'opacity.ghost',
	'opacity.dim',
	'icon.**'
];

const block = (selector: string, media?: string) => (decls: string) =>
	media === undefined
		? `${selector} {\n${decls}\n}`
		: `${media} {\n\t${selector} {\n${decls}\n\t}\n}`;

const Oklch = Schema.Struct({
	colorSpace: Schema.Literal('oklch'),
	components: Schema.Tuple([Schema.Finite, Schema.Finite, Schema.Finite]),
	alpha: Schema.optionalKey(Schema.Finite)
});

const fmt = (n: number) => String(Number(n.toFixed(4)));

const oklch = ({ components: [l, c, h], alpha }: typeof Oklch.Type) =>
	`oklch(${fmt(l * 100)}% ${fmt(c)} ${fmt(h)}${alpha === undefined || alpha === 1 ? '' : ` / ${fmt(alpha)}`})`;

export default defineConfig({
	tokens: ['./tokens/resolver.json'],
	outDir: './src/styles/',
	plugins: [
		css({
			filename: 'tokens.css',
			// Primitives print as plain oklch(), with no wide-gamut copies.
			transform: (token) =>
				token.$type === 'color' && token.aliasOf === undefined
					? Option.getOrNull(Option.map(Schema.decodeUnknownOption(Oklch)(token.$value), oklch))
					: null,
			permutations: [
				{ input: { theme: 'light', size: 'desktop' }, prepare: block(':root') },
				{
					input: { theme: 'dark', size: 'desktop' },
					include: semantic,
					prepare: block(':root:not([data-theme="light"])', '@media (prefers-color-scheme: dark)')
				},
				{
					input: { theme: 'dark', size: 'desktop' },
					include: semantic,
					prepare: block(':root[data-theme="dark"]')
				},
				{
					input: { theme: 'light', size: 'tablet' },
					include: responsive,
					prepare: block(':root', '@media (768px <= width < 1100px)')
				},
				{
					input: { theme: 'light', size: 'phone' },
					include: responsive,
					prepare: block(':root', '@media (width < 768px)')
				}
			]
		})
	]
});
