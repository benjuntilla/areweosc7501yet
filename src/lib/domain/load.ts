import { basename } from 'node:path';
import {
	Toml,
	TomlLocalDate,
	TomlLocalDateTime,
	TomlLocalTime,
	TomlOffsetDateTime
} from '@effected/toml';
import { Array, Data, DateTime, Effect, Option, Order, Record, Schema } from 'effect';
import * as patterns from './patterns.ts';
import { Entry, Spec } from './schema.ts';

export class DataError extends Data.TaggedError('DataError')<{
	readonly file: string;
	readonly message: string;
}> {}

export type SlugEntry = Entry & { readonly slug: string };

// The TOML parser range-checks dates and gives each kind its own class. JSON writes a date-time
// with an offset as the UTC instant the schema reads, and any other date or time as its TOML text
// for the schema to check. DateTime can't hold a leap second, so one stays as text.
const tomlDates = (_key: string, v: unknown) => {
	if (v instanceof TomlOffsetDateTime) {
		return Option.match(DateTime.make(String(v)), {
			onNone: () => String(v),
			onSome: DateTime.formatIso
		});
	}
	return v instanceof TomlLocalDate || v instanceof TomlLocalDateTime || v instanceof TomlLocalTime
		? String(v)
		: v;
};

const decodeToml = <S extends Schema.Top>(schema: S, file: string, text: string) =>
	Toml.parse(text).pipe(
		Effect.flatMap((toml) =>
			Effect.try({ try: () => JSON.stringify(toml, tomlDates), catch: String })
		),
		Effect.flatMap(
			Schema.decodeUnknownEffect(Schema.fromJsonString(schema), { onExcessProperty: 'error' })
		),
		Effect.mapError((e) => new DataError({ file, message: String(e) }))
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
