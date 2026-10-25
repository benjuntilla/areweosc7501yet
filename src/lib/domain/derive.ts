import { Array, DateTime, Match, Option, String as Str } from 'effect';
import type { Entry, HistoryBlock, Role, State } from './schema.ts';
import type { SlugEntry } from './load.ts';

/** A project counts as featured from this many GitHub stars, unless `is_featured` says otherwise. */
export const featuredStars = 1000;

/** Categories left out of a role's score. */
export const unscoredCategories: ReadonlyArray<string> = ['libraries', 'engines'];

/** Verdict words, highest first. A score takes the first word whose minimum it reaches. */
export const ladder = [
	{ min: 0.9, word: 'Yes' },
	{ min: 0.65, word: 'Almost' },
	{ min: 0.35, word: 'Halfway' },
	{ min: 0.1, word: 'Hardly' },
	{ min: 0, word: 'No' }
] as const;
export type Verdict = (typeof ladder)[number]['word'];

export const verdictOf = (score: number): Verdict =>
	Array.findFirst(ladder, (s) => score >= s.min).pipe(
		Option.map((s) => s.word),
		Option.getOrElse((): Verdict => 'No')
	);

export const isFeatured = (e: Entry): boolean =>
	e.is_featured ?? (e.github?.stars ?? 0) >= featuredStars;

export const currentBlock = (e: Entry): Option.Option<HistoryBlock> => Array.last(e.history);

export const currentState = (e: Entry): State =>
	currentBlock(e).pipe(
		Option.map((b) => b.state),
		Option.getOrElse((): State => 'idle')
	);

/** UTC calendar day of a history date. */
export const utcDay = (date: DateTime.Utc): string => DateTime.formatIsoDateUtc(date);

/** The first block of the last run of blocks that `same` considers equal. */
const lastRunStart = (
	blocks: ReadonlyArray<HistoryBlock>,
	same: (a: HistoryBlock, b: HistoryBlock) => boolean
): Option.Option<HistoryBlock> =>
	Array.isReadonlyArrayNonEmpty(blocks)
		? Option.some(Array.headNonEmpty(Array.lastNonEmpty(Array.groupWith(blocks, same))))
		: Option.none();

const sameState = (a: HistoryBlock, b: HistoryBlock) => a.state === b.state;

/** The block where the current state began. None for an entry with no history. */
export const stateStart = (e: Entry): Option.Option<HistoryBlock> =>
	lastRunStart(e.history, sameState);

/** Where the current source was first cited: blocks that repeat the state and source are evidence only. */
const sourceStart = (e: Entry): Option.Option<HistoryBlock> =>
	lastRunStart(e.history, (a, b) => sameState(a, b) && a.source === b.source);

export interface ChangeRow {
	readonly slug: string;
	readonly name: string;
	readonly day: string;
	/** The history date the row comes from. A hand-edited date is midnight UTC. */
	readonly date: DateTime.Utc;
	/** undefined when the entry was added in this state. */
	readonly from: State | undefined;
	readonly to: State;
	readonly source: string;
	readonly version: string | undefined;
}

/**
 * State changes only: evidence-only blocks are skipped, steps on the same UTC day
 * collapse into one row, and an entry added as idle gets no row.
 */
export const changeRows = (e: SlugEntry): ReadonlyArray<ChangeRow> => {
	if (!Array.isReadonlyArrayNonEmpty(e.history)) return [];
	const days = Array.groupWith(e.history, (a, b) => utcDay(a.date) === utcDay(b.date));
	const finalStates = Array.map(days, (day) => Array.lastNonEmpty(day).state);
	return Array.flatMap(days, (day, i) => {
		const to = Array.lastNonEmpty(day).state;
		const from = Option.getOrUndefined(Array.get(finalStates, i - 1));
		if (from === to || (from === undefined && to === 'idle')) return [];
		// The first block of the day's final run is what moved it to that state.
		const block = Option.getOrElse(lastRunStart(day, sameState), () => Array.headNonEmpty(day));
		return [
			{
				slug: e.slug,
				name: e.name,
				day: utcDay(block.date),
				date: block.date,
				from,
				to,
				source: block.source,
				version: block.version
			}
		];
	});
};

export const formatDay = (date: DateTime.Utc): string =>
	DateTime.formatUtc(date, {
		locale: 'en-US',
		month: 'short',
		day: 'numeric'
	});

const pullRequest = /\/pull\/(\d+)/u;
const isCommit = (source: string) => Option.isSome(Str.match(/\/commit\//u)(source));
const isIssue = (source: string) => Option.isSome(Str.match(/\/issues\/\d+/u)(source));

/** The popover sentence, written from the current state and its history block. */
export const sentenceOf = (e: Entry): string =>
	Option.match(currentBlock(e), {
		onNone: () => 'No code yet.',
		onSome: (b) => {
			// The latest block dates releases and merges. A state's own date comes from where it
			// began, and "open since" from where its source was first cited, so a later
			// evidence-only block doesn't move either.
			const d = formatDay(b.date);
			const began = formatDay(Option.getOrElse(stateStart(e), () => b).date);
			const since = formatDay(Option.getOrElse(sourceStart(e), () => b).date);
			return Match.value(b.state).pipe(
				Match.when('done', () =>
					b.version === undefined
						? `In its official docs since ${began}.`
						: `Shipped in ${b.version} on ${d}.`
				),
				Match.when('working', () =>
					Option.match(Str.match(pullRequest)(b.source), {
						onSome: (pr) => `PR #${pr[1] ?? ''} has been open since ${since}.`,
						onNone: () => {
							if (!isCommit(b.source)) return `Announced on ${since}.`;
							const tag = e.github?.latest_release_tag;
							const latest = tag === undefined ? '' : ` Latest is ${tag}.`;
							return `Merged on ${d}, not in a release yet.${latest}`;
						}
					})
				),
				Match.when(
					'blocked',
					() => `The implementation PR was closed on ${began} without merging.`
				),
				Match.when('idle', () =>
					isIssue(b.source)
						? `No code yet. The request has been open since ${since}.`
						: 'No code yet.'
				),
				Match.when(
					'error',
					() => `The maintainer closed the request on ${began} without adding support.`
				),
				Match.exhaustive
			);
		}
	});

export interface RoleSummary {
	readonly role: Role;
	readonly verdict: Verdict;
	readonly score: number;
	readonly done: number;
	readonly working: number;
	readonly featured: number;
}

/** Score = (done + half of working) ÷ featured entries, leaving out libraries and engines. */
export const summarize = (entries: ReadonlyArray<Entry>, role: Role): RoleSummary => {
	const counted = Array.filter(
		entries,
		(e) => e.role === role && isFeatured(e) && !Array.contains(unscoredCategories, e.category)
	);
	const featured = Array.length(counted);
	const done = Array.countBy(counted, (e) => currentState(e) === 'done');
	const working = Array.countBy(counted, (e) => currentState(e) === 'working');
	const score = featured === 0 ? 0 : (done + working / 2) / featured;
	return { role, verdict: verdictOf(score), score, done, working, featured };
};
