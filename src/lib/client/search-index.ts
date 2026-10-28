import { Array, Effect, Order, Record, String as Str } from 'effect';
import { FetchHttpClient, HttpClient, HttpClientResponse } from 'effect/http';
import MiniSearch from 'minisearch';
import { SearchRecords } from '#lib/domain/search.ts';

const words = (query: string) =>
	Array.filter(Str.split(Str.toLowerCase(query), /\s+/u), Str.isNonEmpty);

/** Splits a name so that the odd parts are the query's words, for the dialog to mark. */
const markWords = (name: string, query: string) => {
	const longestFirst = Array.sort(
		words(query),
		Order.flip(Order.mapInput(Order.Number, Str.length))
	);
	return Str.split(
		name,
		new RegExp(
			`(${Array.join(
				Array.map(longestFirst, (w) => RegExp.escape(w)),
				'|'
			)})`,
			'iu'
		)
	);
};

/** Loads the entries and indexes them. Gives a function from a query to its matches, grouped by category, best group first. */
export const find = HttpClient.get('/search.json').pipe(
	Effect.flatMap(HttpClientResponse.schemaBodyJson(SearchRecords)),
	Effect.provide(FetchHttpClient.layer),
	Effect.map((entries) => {
		const index = new MiniSearch({
			idField: 'slug',
			fields: ['name', 'aliases', 'repo', 'inner'],
			// "inner" holds every suffix of each word, so "code" also finds opencode, KnightCode, and xcodes.
			processTerm: (term, field) => {
				const t = Str.toLowerCase(term);
				return field === 'inner' ? Array.makeBy(t.length - 1, (i) => t.slice(i + 1)) : t;
			},
			searchOptions: {
				boost: { name: 3, aliases: 2, repo: 1, inner: 0.5 },
				prefix: true,
				fuzzy: 0.2,
				combineWith: 'AND',
				processTerm: Str.toLowerCase
			}
		});
		index.addAll(
			Array.map(entries, (e) => ({
				slug: e.slug,
				name: e.name,
				aliases: Array.join(e.aliases, ' '),
				repo: e.repo,
				inner: Array.join([e.name, ...e.aliases, e.repo], ' ')
			}))
		);
		const bySlug = Record.fromIterableBy(entries, (e) => e.slug);
		return (query: string) => {
			const found = Array.getSomes(
				Array.map(index.search(query), (r) => Record.get(bySlug, String(r.id)))
			);
			const matches = Array.map(found, (e) => ({ ...e, parts: markWords(e.name, query) }));
			return Record.toEntries(Array.groupBy(matches, (m) => m.category));
		};
	}),
	Effect.runPromise
);
