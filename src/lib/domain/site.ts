import { Array, DateTime, Option, Order, Schema, Struct } from 'effect';
import {
	type ChangeRow,
	changeRows,
	currentState,
	isFeatured,
	ladder,
	type RoleSummary,
	sentenceOf,
	stateStart,
	summarize
} from './derive.ts';
import { Day } from './formats.ts';
import type { SlugEntry } from './load.ts';
import {
	type Checker,
	entryFields,
	entryRules,
	SpecRevision,
	states,
	type Spec
} from './schema.ts';

const newestFirst = Order.flip(Order.mapInput(DateTime.Order, (r: ChangeRow) => r.date));

/** Everything the pages and endpoints read, derived once per build. */
export const buildSite = (data: {
	spec: Spec;
	checker: typeof Checker.Type;
	entries: ReadonlyArray<SlugEntry>;
}) => ({
	spec: { current: Array.lastNonEmpty(data.spec.revision).number, revisions: data.spec.revision },
	verdicts: {
		program: summarize(data.entries, 'program'),
		terminal: summarize(data.entries, 'terminal')
	},
	entries: Array.map(data.entries, (e) => ({
		...e,
		last_checked_date: e.last_checked_date ?? data.checker.last_run,
		state: currentState(e),
		since: Option.getOrUndefined(Option.map(stateStart(e), (b) => b.date)),
		featured: isFeatured(e),
		sentence: sentenceOf(e)
	})),
	changes: Array.sort(
		Array.flatMap(
			Array.filter(data.entries, (e: SlugEntry) => isFeatured(e)),
			(e: SlugEntry) => changeRows(e)
		),
		newestFirst
	)
});
export type Site = ReturnType<typeof buildSite>;

const VerdictSummary = Schema.Struct({
	word: Schema.Literals(ladder.map((s) => s.word)),
	score: Schema.Finite,
	done: Schema.Int,
	working: Schema.Int,
	featured: Schema.Int
});

/**
 * The public /data.json contract. Adding a field keeps schemaVersion; renaming or
 * removing one bumps it.
 */
export const DataJson = Schema.Struct({
	schemaVersion: Schema.Literal(3),
	generatedAt: Schema.String,
	spec: Schema.Struct({ current: Schema.String, revisions: Schema.Array(SpecRevision) }),
	verdicts: Schema.Struct({ program: VerdictSummary, terminal: VerdictSummary }),
	entries: Schema.Array(
		Schema.Struct({
			slug: Schema.String,
			...entryFields,
			last_checked_date: Day,
			state: Schema.Literals(states),
			featured: Schema.Boolean
		}).check(entryRules)
	)
});
export type DataJson = typeof DataJson.Type;

/** The public word for a verdict, with the counts, in data.json's field order. */
const verdictJson = (v: RoleSummary) => ({
	word: v.verdict,
	...Struct.pick(v, ['score', 'done', 'working', 'featured'])
});

/** data.json as JSON, with dates encoded back to ISO strings by the schema. */
export const toDataJson = (site: Site, generatedAt: DateTime.Utc): typeof DataJson.Encoded =>
	Schema.encodeSync(DataJson)({
		schemaVersion: 3,
		generatedAt: DateTime.formatIso(generatedAt),
		spec: site.spec,
		verdicts: {
			program: verdictJson(site.verdicts.program),
			terminal: verdictJson(site.verdicts.terminal)
		},
		entries: Array.map(site.entries, Struct.omit(['since', 'sentence']))
	});
