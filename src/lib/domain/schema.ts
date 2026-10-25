import { Schema } from 'effect';

export const states = ['done', 'working', 'blocked', 'idle', 'error'] as const;
export type State = (typeof states)[number];

export const roles = ['program', 'terminal'] as const;
export type Role = (typeof roles)[number];

export const categoriesByRole = {
	program: ['coding-agents', 'clis', 'libraries'],
	terminal: ['emulators', 'multiplexers', 'engines']
} as const;
export type Category = (typeof categoriesByRole)[Role][number];

// Dates stay strings once decoded. TOML writes them as native dates, so the
// JSON Schema says `format` rather than `pattern`, which is what Tombi checks.
const Day = Schema.String.check(
	Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/u, { toJsonSchema: () => ({ format: 'date' }) })
);
const DateTime = Schema.String.check(
	Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/u, {
		toJsonSchema: () => ({ format: 'date-time' })
	})
);
const DayOrTime = Schema.Union([Day, DateTime]);
const Url = Schema.String.check(Schema.isPattern(/^https:\/\/\S+$/u));
const Repo = Schema.String.check(Schema.isPattern(/^[\w.-]+\/[\w.-]+$/u));

const describe =
	<S extends Schema.Top>(description: string) =>
	(s: S) =>
		s.annotate({ description });

export const HistoryBlock = Schema.Struct({
	date: DayOrTime.pipe(describe('When the state or its evidence changed, in UTC')),
	state: Schema.Literals(states).pipe(describe('State from this date on')),
	source: Url.pipe(describe('The PR, commit, release, issue or docs page it rests on')),
	version: Schema.optionalKey(Schema.String.pipe(describe('The release that shipped it')))
});
export type HistoryBlock = typeof HistoryBlock.Type;

export const Github = Schema.Struct({
	stars: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
	latest_release_tag: Schema.optionalKey(Schema.String),
	latest_release_date: Schema.optionalKey(Day)
}).pipe(describe('Written by the weekly checker'));

export const entryFields = {
	name: Schema.String.pipe(describe('Display name')),
	url: Url.pipe(describe('Homepage or repo')),
	repo: Schema.optionalKey(
		Repo.pipe(describe('GitHub owner/name the checker watches. Leave it out off GitHub'))
	),
	role: Schema.Literals(roles).pipe(describe('Programs send reports, terminals show them')),
	category: Schema.Literals([...categoriesByRole.program, ...categoriesByRole.terminal]),
	is_featured: Schema.optionalKey(
		Schema.Boolean.pipe(describe('Overrides the 1,000-star rule either way'))
	),
	aliases: Schema.optionalKey(Schema.Array(Schema.String).pipe(describe('Extra search terms'))),
	spec_revision: Schema.String.pipe(describe('Spec revision it was checked against')),
	note: Schema.optionalKey(Schema.String.pipe(describe('Caveat shown in the popover'))),
	last_checked_date: Day.pipe(describe('Last re-verification')),
	github: Schema.optionalKey(Github),
	history: Schema.Array(HistoryBlock).pipe(
		describe('Oldest first. The last block is the current state. No blocks means idle')
	)
};

/** One project, as stored in data/entries/<slug>.toml. */
export const Entry = Schema.Struct(entryFields).check(
	Schema.makeFilter((e) => {
		const issues: Array<Schema.FilterIssue> = [];
		if (!(categoriesByRole[e.role] as ReadonlyArray<string>).includes(e.category)) {
			issues.push({ path: ['category'], issue: `${e.category} isn't a ${e.role} category` });
		}
		if (e.url.startsWith('https://github.com/') && e.repo === undefined) {
			issues.push({ path: ['repo'], issue: 'a project on GitHub needs a repo for the checker' });
		}
		e.history.forEach((h, i) => {
			// Projects off GitHub can be done from their official docs, with no version.
			if (h.state === 'done' && h.version === undefined && e.repo !== undefined) {
				issues.push({ path: ['history', i, 'version'], issue: 'a done block needs a version' });
			}
			if (i > 0 && Date.parse(h.date) < Date.parse(e.history[i - 1]!.date)) {
				issues.push({ path: ['history', i, 'date'], issue: 'history must be in date order' });
			}
		});
		return issues;
	})
);
export type Entry = typeof Entry.Type;

export const SpecRevision = Schema.Struct({ number: Schema.String, date: Day, url: Url });

/** data/spec.toml */
export const Spec = Schema.Struct({
	revision: Schema.NonEmptyArray(SpecRevision)
});
export type Spec = typeof Spec.Type;
