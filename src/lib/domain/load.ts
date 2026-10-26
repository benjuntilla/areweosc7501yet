import { basename } from 'node:path';
import { Array, Data, Effect, Order, Record, Schema } from 'effect';
import { Toml } from 'effect/encoding';
import * as patterns from './patterns.ts';
import { Entry, Spec } from './schema.ts';

export class DataError extends Data.TaggedError('DataError')<{
	readonly file: string;
	readonly message: string;
}> {}

export type SlugEntry = Entry & { readonly slug: string };

// Effect's TOML parser range-checks dates and returns date-times with an offset as Dates.
// JSON turns those into the ISO strings the schema reads.
const decodeToml = <S extends Schema.Top>(schema: S, file: string, text: string) =>
	Effect.try({
		try: () => JSON.stringify(Toml.parse(text)),
		catch: (e) => new DataError({ file, message: String(e) })
	}).pipe(
		Effect.flatMap(
			Schema.decodeUnknownEffect(Schema.fromJsonString(schema), { onExcessProperty: 'error' })
		),
		Effect.mapError((e) =>
			e instanceof DataError ? e : new DataError({ file, message: String(e) })
		)
	);

const Slug = Schema.String.check(Schema.isPattern(patterns.slug));

/**
 * Decodes every entry file and the spec. `entries` maps a file path to its text,
 * as `import.meta.glob(..., { query: '?raw' })` returns it.
 */
export const loadData = (entries: Readonly<Record<string, string>>, specText: string) =>
	Effect.gen(function* () {
		const spec = yield* decodeToml(Spec, 'data/spec.toml', specText);
		const decoded = yield* Effect.forEach(
			Record.toEntries(entries),
			([file, text]) =>
				Effect.gen(function* () {
					const slug = yield* Schema.decodeUnknownEffect(Slug)(basename(file, '.toml')).pipe(
						Effect.mapError(
							() => new DataError({ file, message: `bad slug ${basename(file, '.toml')}` })
						)
					);
					const entry = yield* decodeToml(Entry, file, text);
					return { slug, ...entry } satisfies SlugEntry;
				}),
			{ concurrency: 'unbounded' }
		);
		return {
			spec,
			entries: Array.sort(
				decoded,
				Order.mapInput(Order.String, (e: SlugEntry) => e.slug)
			)
		};
	});
