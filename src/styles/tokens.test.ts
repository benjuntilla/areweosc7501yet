import { describe, expect, it } from '@effect/vitest';
import { Array, Effect, HashMap, Option, Predicate, Record, Result, Schema } from 'effect';
import components from '../../tokens/components.tokens.json' with { type: 'json' };
import primitives from '../../tokens/primitives.tokens.json' with { type: 'json' };
import dark from '../../tokens/semantic.dark.tokens.json' with { type: 'json' };
import light from '../../tokens/semantic.light.tokens.json' with { type: 'json' };
import { Oklch } from './oklch.ts';

const Token = Schema.Struct({ $value: Schema.Union([Schema.String, Oklch, Schema.Unknown]) });
type Token = typeof Token.Type;

const flatten = (
	tree: unknown,
	path: ReadonlyArray<string> = []
): Effect.Effect<ReadonlyArray<readonly [string, Token]>, Schema.SchemaError> =>
	Predicate.isObject(tree) && '$value' in tree
		? Effect.map(Schema.decodeUnknownEffect(Token)(tree), (t) => [[`--${path.join('-')}`, t]])
		: Effect.map(
				Effect.forEach(Record.toEntries(Predicate.isObject(tree) ? tree : {}), ([k, v]) =>
					flatten(v, [...path, k])
				),
				Array.flatten
			);

type Rgb = readonly [number, number, number];
interface Rgba {
	readonly rgb: Rgb;
	readonly alpha: number;
}

const toSrgb = (x: number) => {
	const c = Math.min(1, Math.max(0, x));
	return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};

// Björn Ottosson's OKLab to sRGB.
const oklchToSrgb = (l: number, c: number, h: number): Rgb => {
	const a = c * Math.cos((h * Math.PI) / 180);
	const b = c * Math.sin((h * Math.PI) / 180);
	const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		toSrgb(4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc),
		toSrgb(-1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc),
		toSrgb(-0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc)
	];
};

const toLinear = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]: Rgb) =>
	0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

const over = (fg: Rgba, bg: Rgb): Rgb => [
	fg.rgb[0] * fg.alpha + bg[0] * (1 - fg.alpha),
	fg.rgb[1] * fg.alpha + bg[1] * (1 - fg.alpha),
	fg.rgb[2] * fg.alpha + bg[2] * (1 - fg.alpha)
];

const contrast = (fg: Rgba, bg: Rgba) => {
	const a = luminance(over(fg, bg.rgb));
	const b = luminance(bg.rgb);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

const loadTokens = (mode: 'Light' | 'Dark') =>
	Effect.map(
		Effect.forEach([primitives, mode === 'Light' ? light : dark, components], (tree) =>
			flatten(tree)
		),
		(lists) => HashMap.fromIterable(Array.flatten(lists))
	);

/** A token's color, following aliases down to its OKLCH primitive. */
const resolve = (tokens: HashMap.HashMap<string, Token>, name: string): Rgba => {
	const value = Option.getOrThrow(HashMap.get(tokens, name)).$value;
	if (Predicate.isString(value))
		return resolve(tokens, `--${value.slice(1, -1).replaceAll('.', '-')}`);
	if (!Schema.is(Oklch)(value)) throw new Error(`${name} isn't a color`);
	const [l, c, h] = value.components;
	return { rgb: oklchToSrgb(l, c, h), alpha: value.alpha ?? 1 };
};

const texts = [
	'--content-text',
	'--content-text-strong',
	'--content-text-muted',
	'--status-done',
	'--status-working-text',
	'--status-blocked',
	'--status-idle',
	'--status-error'
];
const surfaces = ['--page-background', '--card-background'];

describe('tokens', () => {
	for (const mode of ['Light', 'Dark'] as const)
		it.effect(`text meets 4.5:1 on every surface in ${mode}`, () =>
			Effect.gen(function* () {
				const tokens = yield* loadTokens(mode);
				const failures = Array.flatMap(surfaces, (s) =>
					Array.filterMap(texts, (t) => {
						const ratio = contrast(resolve(tokens, t), resolve(tokens, s));
						return ratio < 4.5
							? Result.succeed(`${t} on ${s}: ${ratio.toFixed(2)}`)
							: Result.failVoid;
					})
				);
				expect(failures).toEqual([]);
			})
		);
});
