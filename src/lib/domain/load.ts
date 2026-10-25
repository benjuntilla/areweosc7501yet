import { Data, Effect, Schema } from 'effect';
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
		if (v.isDate() || v.isLocal()) return v.toISOString();
		return new Date(v.getTime()).toISOString().replace('.000Z', 'Z');
	}
	if (Array.isArray(v)) return v.map((x) => plain(x));
	if (v !== null && typeof v === 'object') {
		return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
	}
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

const slugOf = (file: string) => file.replace(/^.*\//u, '').replace(/\.toml$/u, '');

/**
 * Decodes every entry file and the spec. `entries` maps a file path to its text,
 * as `import.meta.glob(..., { query: '?raw' })` returns it.
 */
export const loadData = (entries: Readonly<Record<string, string>>, specText: string) =>
	Effect.gen(function* () {
		const spec = yield* decodeToml(Spec, 'data/spec.toml', specText);
		const decoded = yield* Effect.forEach(
			Object.entries(entries),
			([file, text]) =>
				Effect.gen(function* () {
					const slug = slugOf(file);
					if (!/^[a-z0-9]+(-[a-z0-9]+)*$/u.test(slug)) {
						return yield* new DataError({ file, message: `bad slug ${slug}` });
					}
					const entry = yield* decodeToml(Entry, file, text);
					return { slug, ...entry } satisfies SlugEntry;
				}),
			{ concurrency: 'unbounded' }
		);
		return { spec, entries: decoded.toSorted((a, b) => a.slug.localeCompare(b.slug)) };
	});
