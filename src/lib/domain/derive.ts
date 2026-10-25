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

export const verdictOf = (score: number): Verdict => ladder.find((s) => score >= s.min)!.word;

export const isFeatured = (e: Entry): boolean =>
	e.is_featured ?? (e.github?.stars ?? 0) >= featuredStars;

export const currentBlock = (e: Entry): HistoryBlock | undefined => e.history.at(-1);

export const currentState = (e: Entry): State => currentBlock(e)?.state ?? 'idle';

/** UTC calendar day of a history date, which may be a date or a datetime. */
export const utcDay = (date: string): string =>
	date.length === 10 ? date : new Date(date).toISOString().slice(0, 10);

/** The block where the current state began, or undefined for an entry with no history. */
export const stateStart = (e: Entry): HistoryBlock | undefined => {
	let i = e.history.length - 1;
	while (i > 0 && e.history[i - 1]!.state === e.history[i]!.state) i--;
	return e.history[i];
};

export interface ChangeRow {
	readonly slug: string;
	readonly name: string;
	readonly day: string;
	/** The history date the row comes from: a datetime, or a date for hand edits. */
	readonly date: string;
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
	const rows: Array<ChangeRow> = [];
	let prev: State | undefined;
	let i = 0;
	while (i < e.history.length) {
		const day = utcDay(e.history[i]!.date);
		let end = i;
		while (end + 1 < e.history.length && utcDay(e.history[end + 1]!.date) === day) end++;
		const to = e.history[end]!.state;
		// The first block of the day's final run is what moved it to that state.
		let first = end;
		while (first > i && e.history[first - 1]!.state === to) first--;
		const block = e.history[first]!;
		const from = prev;
		prev = to;
		i = end + 1;
		if (from === to || (from === undefined && to === 'idle')) continue;
		rows.push({
			slug: e.slug,
			name: e.name,
			day,
			date: block.date,
			from,
			to,
			source: block.source,
			version: block.version
		});
	}
	return rows;
};

/** Monday of the UTC week a day falls in. */
export const weekStart = (day: string): string => {
	const d = new Date(`${day}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
	return d.toISOString().slice(0, 10);
};

const shortDate = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	timeZone: 'UTC'
});
export const formatDay = (date: string): string =>
	shortDate.format(new Date(`${utcDay(date)}T00:00:00Z`));

/** The popover sentence, written from the current state and its history block. */
export const sentenceOf = (e: Entry): string => {
	const b = currentBlock(e);
	if (b === undefined) return 'No code yet.';
	const d = formatDay(b.date);
	switch (b.state) {
		case 'done':
			return b.version === undefined
				? `In its official docs since ${d}.`
				: `Shipped in ${b.version} on ${d}.`;
		case 'working': {
			const pr = /\/pull\/(\d+)/u.exec(b.source);
			if (pr) return `PR #${pr[1]} has been open since ${d}.`;
			if (/\/commit\//u.test(b.source)) {
				const tag = e.github?.latest_release_tag;
				return `Merged on ${d}, not in a release yet.${tag ? ` Latest is ${tag}.` : ''}`;
			}
			return `Announced on ${d}.`;
		}
		case 'blocked':
			return `The maintainer closed the request on ${d} without adding support.`;
		case 'idle':
			return /\/issues\/\d+/u.test(b.source)
				? `No code yet. The request has been open since ${d}.`
				: 'No code yet.';
		case 'error':
			return `The implementation PR was closed on ${d} without merging.`;
	}
};

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
	const counted = entries.filter(
		(e) => e.role === role && isFeatured(e) && !unscoredCategories.includes(e.category)
	);
	const done = counted.filter((e) => currentState(e) === 'done').length;
	const working = counted.filter((e) => currentState(e) === 'working').length;
	const score = counted.length === 0 ? 0 : (done + working / 2) / counted.length;
	return { role, verdict: verdictOf(score), score, done, working, featured: counted.length };
};
