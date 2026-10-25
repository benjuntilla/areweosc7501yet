import { basename } from 'node:path';
import {
	Array,
	Data,
	DateTime,
	Effect,
	Order,
	Predicate,
	Record,
	Schema,
	String as Str
} from 'effect';
import { parse, TomlDate } from 'smol-toml';
import { Entry, Spec } from './schema.ts';

export class DataError extends Data.TaggedError('DataError')<{
	readonly file: string;
	readonly message: string;
}> {}

export type SlugEntry = Entry & { readonly slug: string };

/** smol-toml parses dates as TomlDate objects. The schema wants ISO strings, in UTC. */
const plain = (v: unknown): unknown => {
	if (v instanceof TomlDate) {
		// Local dates and times have no zone to convert. The schema rejects local times.
		return v.isDate() || v.isLocal()
			? v.toISOString()
			: Str.replace('.000Z', 'Z')(DateTime.formatIso(DateTime.makeUnsafe(v)));
	}
	if (Array.isArray(v)) return Array.map(v, (x) => plain(x));
	if (Predicate.isObject(v)) return Record.map(v, (x) => plain(x));
	return v;
};

const decodeToml = <S extends Schema.Decoder<unknown>>(schema: S, file: string, text: string) =>
	Effect.try({
		try: () => plain(parse(text)),
		catch: (e) => new DataError({ file, message: String(e) })
	}).pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(schema, { onExcessProperty: 'error' })),
		Effect.mapError((e) =>
			e instanceof DataError ? e : new DataError({ file, message: String(e) })
		)
	);

const Slug = Schema.String.check(Schema.isPattern(/^[a-z0-9]+(-[a-z0-9]+)*$/u));

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
