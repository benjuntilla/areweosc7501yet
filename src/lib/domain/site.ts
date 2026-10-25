import { Schema } from 'effect';
import {
	changeRows,
	currentState,
	isFeatured,
	ladder,
	sentenceOf,
	stateStart,
	summarize
} from './derive.ts';
import type { SlugEntry } from './load.ts';
import { entryFields, SpecRevision, states, type Spec } from './schema.ts';

/** Everything the pages and endpoints read, derived once per build. */
export const buildSite = (data: { spec: Spec; entries: ReadonlyArray<SlugEntry> }) => ({
	spec: { current: data.spec.revision.at(-1)!.number, revisions: data.spec.revision },
	verdicts: {
		program: summarize(data.entries, 'program'),
		terminal: summarize(data.entries, 'terminal')
	},
	entries: data.entries.map((e) => ({
		...e,
		state: currentState(e),
		since: stateStart(e)?.date,
		featured: isFeatured(e),
		sentence: sentenceOf(e)
	})),
	changes: data.entries
		.filter((e) => isFeatured(e))
		.flatMap((e) => changeRows(e))
		.toSorted((a, b) => Date.parse(b.date) - Date.parse(a.date))
});
export type Site = ReturnType<typeof buildSite>;

const VerdictSummary = Schema.Struct({
	word: Schema.Literals(ladder.map((s) => s.word)),
	score: Schema.Number,
	done: Schema.Int,
	working: Schema.Int,
	featured: Schema.Int
});

/**
 * The public /data.json contract. Adding a field keeps schemaVersion; renaming or
 * removing one bumps it.
 */
export const DataJson = Schema.Struct({
	schemaVersion: Schema.Literal(1),
	generatedAt: Schema.String,
	spec: Schema.Struct({ current: Schema.String, revisions: Schema.Array(SpecRevision) }),
	verdicts: Schema.Struct({ program: VerdictSummary, terminal: VerdictSummary }),
	entries: Schema.Array(
		Schema.Struct({
			slug: Schema.String,
			...entryFields,
			state: Schema.Literals(states),
			featured: Schema.Boolean
		})
	)
});
export type DataJson = typeof DataJson.Type;

export const toDataJson = (site: Site, generatedAt: Date): DataJson => {
	const verdict = ({
		verdict: word,
		score,
		done,
		working,
		featured
	}: Site['verdicts']['program']) => ({
		word,
		score,
		done,
		working,
		featured
	});
	return {
		schemaVersion: 1,
		generatedAt: generatedAt.toISOString(),
		spec: site.spec,
		verdicts: {
			program: verdict(site.verdicts.program),
			terminal: verdict(site.verdicts.terminal)
		},
		entries: site.entries.map(({ since: _since, sentence: _sentence, ...e }) => e)
	};
};
