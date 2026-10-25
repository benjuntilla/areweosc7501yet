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
// The patterns check the shape; this checks each part is in range, without Date
// parsing, which quietly rolls Feb 30 over to Mar 2.
const isLeap = (y: number) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const daysInMonth = (y: number, m: number) =>
	[31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
export const isRealDate = (s: string): boolean => {
	const m =
		/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2})))?$/u.exec(
			s
		);
	if (m === null) return false;
	const n = (i: number) => Number(m[i] ?? 0);
	const [y, mo, d, h, mi, se, oh, om] = [n(1), n(2), n(3), n(4), n(5), n(6), n(7), n(8)];
	return (
		mo >= 1 &&
		mo <= 12 &&
		d >= 1 &&
		d <= daysInMonth(y, mo) &&
		h <= 23 &&
		mi <= 59 &&
		se <= 59 &&
		oh <= 23 &&
		om <= 59
	);
};
const realDate = Schema.makeFilter(isRealDate, {
	expected: 'a real calendar date and time',
	toJsonSchema: () => ({})
});
const Day = Schema.String.check(
	Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/u, { toJsonSchema: () => ({ format: 'date' }) }),
	realDate
);
const DateTime = Schema.String.check(
	Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/u, {
		toJsonSchema: () => ({ format: 'date-time' })
	}),
	realDate
);
const DayOrTime = Schema.Union([Day, DateTime]);
export const isHttpsUrl = (s: string): boolean => {
	// Lowercase scheme only, matching the JSON Schema pattern; URL would lowercase it.
	if (!s.startsWith('https://') || !URL.canParse(s) || /\s/u.test(s)) return false;
	const url = new URL(s);
	return url.protocol === 'https:' && url.hostname !== '';
};
const Url = Schema.String.check(
	Schema.makeFilter(isHttpsUrl, {
		expected: 'an https URL with a host',
		toJsonSchema: () => ({ format: 'uri', pattern: '^https://' })
	})
);
const Repo = Schema.String.check(Schema.isPattern(/^[\w.-]+\/[\w.-]+$/u));

/** owner/name when the URL is a GitHub repository (or a page inside one), else undefined. */
export const githubRepoOf = (url: string): string | undefined => {
	if (!URL.canParse(url)) return undefined;
	const { hostname, pathname } = new URL(url);
	if (hostname.toLowerCase() !== 'github.com') return undefined;
	const [owner, name] = pathname.split('/').filter((part) => part !== '');
	return owner === undefined || name === undefined
		? undefined
		: `${owner}/${name.replace(/\.git$/u, '')}`;
};

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

// The rules JSON Schema can express, so Tombi and data.json readers get them too.
// It can't compare the repo to the URL or order the history; the decoder checks those.
// `then` is JSON Schema's keyword here, never a promise.
// oxlint-disable-next-line unicorn/no-thenable
const ifThen = (cond: object, then: object) => ({ if: cond, then });

const entryRulesJsonSchema = () => ({
	allOf: [
		...roles.map((role) =>
			ifThen(
				{ properties: { role: { const: role } }, required: ['role'] },
				{ properties: { category: { enum: [...categoriesByRole[role]] } } }
			)
		),
		// A GitHub repository URL (any letter case in the host) needs a repo.
		ifThen(
			{
				properties: {
					url: { pattern: '^https://[Gg][Ii][Tt][Hh][Uu][Bb]\\.[Cc][Oo][Mm]/[^/]+/[^/]+' }
				},
				required: ['url']
			},
			{ required: ['repo'] }
		),
		ifThen(
			{ required: ['repo'] },
			{
				properties: {
					history: {
						items: ifThen(
							{ properties: { state: { const: 'done' } }, required: ['state'] },
							{ required: ['version'] }
						)
					}
				}
			}
		)
	]
});

/** Cross-field rules for an entry. Also applied to each entry in data.json. */
export const entryRules = Schema.makeFilter<{
	readonly url: string;
	readonly repo?: string;
	readonly role: Role;
	readonly category: Category;
	readonly history: ReadonlyArray<HistoryBlock>;
}>(
	(e) => {
		const issues: Array<Schema.FilterIssue> = [];
		if (!(categoriesByRole[e.role] as ReadonlyArray<string>).includes(e.category)) {
			issues.push({ path: ['category'], issue: `${e.category} isn't a ${e.role} category` });
		}
		const urlRepo = githubRepoOf(e.url);
		if (urlRepo !== undefined && e.repo?.toLowerCase() !== urlRepo.toLowerCase()) {
			issues.push({
				path: ['repo'],
				issue: `a GitHub url needs repo = "${urlRepo}" for the checker`
			});
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
	},
	{ toJsonSchema: entryRulesJsonSchema }
);

/** One project, as stored in data/entries/<slug>.toml. */
export const Entry = Schema.Struct(entryFields).check(entryRules);
export type Entry = typeof Entry.Type;

export const SpecRevision = Schema.Struct({ number: Schema.String, date: Day, url: Url });

/** data/spec.toml */
export const Spec = Schema.Struct({
	revision: Schema.NonEmptyArray(SpecRevision)
});
export type Spec = typeof Spec.Type;
