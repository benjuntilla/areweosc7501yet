import { Array, DateTime, Equivalence, Option, Schema, String } from 'effect';

export const states = ['done', 'working', 'blocked', 'idle', 'error'] as const;
export type State = (typeof states)[number];

export const roles = ['program', 'terminal'] as const;
export type Role = (typeof roles)[number];

export const categoriesByRole = {
	program: ['coding-agents', 'clis', 'libraries'],
	terminal: ['emulators', 'multiplexers', 'engines']
} as const;
export type Category = (typeof categoriesByRole)[Role][number];

// Dates and URLs stay strings once decoded. The published JSON Schema describes them with
// `format` (TOML writes dates as native dates, which is what Tombi checks). The decoder is
// stricter: each value must survive a round trip through Effect's DateTime or URL, so
// Feb 30, 24:00, leap seconds or a hostless URL fail here.
const formatted = (
	pattern: RegExp,
	jsonSchema: { readonly format: string; readonly pattern?: string },
	expected: string,
	valid: (s: string) => boolean
) =>
	Schema.String.check(
		Schema.isPattern(pattern, { toJsonSchema: () => jsonSchema }),
		Schema.makeFilter(valid, { expected, toJsonSchema: () => ({}) })
	);

const Day = formatted(/^\d{4}-\d{2}-\d{2}$/u, { format: 'date' }, 'a valid date', (s) =>
	Option.exists(DateTime.make(s), (d) => DateTime.formatIsoDateUtc(d) === s)
);
// The wall-clock fields must come back unchanged in the stated offset (Effect parses
// numeric offsets, so Z is read as +00:00).
const DateTimeString = formatted(
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/u,
	{ format: 'date-time' },
	'a valid date-time',
	(s) =>
		Option.exists(
			DateTime.makeZonedFromString(String.replace(/Z$/u, '+00:00')(s)),
			(d) => String.takeLeft(DateTime.formatIsoOffset(d), 19) === String.takeLeft(s, 19)
		)
);
const DayOrTime = Schema.Union([Day, DateTimeString]);
// A lowercase https scheme, optional userinfo, a nonempty host and an optional port, then
// the end or a path, query or fragment. URL itself must parse it, and only RFC 3986
// characters may appear (URL would quietly encode spaces or quotes).
const urlPattern = '^https://([^/?#\\s@]*@)?[^/?#\\s@:]+(:[0-9]*)?([/?#]|$)';
const Url = formatted(
	new RegExp(urlPattern, 'u'),
	{ format: 'uri', pattern: urlPattern },
	'an https URL with a host',
	(s) => URL.canParse(s) && /^[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/u.test(s)
);
const Repo = Schema.String.check(Schema.isPattern(/^[\w.-]+\/[\w.-]+$/u));

/** owner/name when the URL is a GitHub repository (or a page inside one). */
export const githubRepoOf = (url: string): Option.Option<string> => {
	if (!URL.canParse(url)) return Option.none();
	const { hostname, pathname } = new URL(url);
	if (String.toLowerCase(hostname) !== 'github.com') return Option.none();
	const [owner, name] = Array.filter(String.split(pathname, '/'), String.isNonEmpty);
	return owner === undefined || name === undefined
		? Option.none()
		: Option.some(`${owner}/${String.replace(/\.git$/u, '')(name)}`);
};
const sameRepo = Equivalence.mapInput(Equivalence.String, (s: string) => String.toLowerCase(s));

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

/** A github.com URL (any letter case) with owner and name path segments, like githubRepoOf reads it. */
export const githubRepoUrlPattern =
	'^https://[Gg][Ii][Tt][Hh][Uu][Bb]\\.[Cc][Oo][Mm]/[^/?#]+/[^/?#]+([/?#]|$)';

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
					url: { pattern: githubRepoUrlPattern }
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
	(e): Array<Schema.FilterIssue> => [
		...(Array.contains(categoriesByRole[e.role] as ReadonlyArray<string>, e.category)
			? []
			: [{ path: ['category'], issue: `${e.category} isn't a ${e.role} category` }]),
		...Option.match(githubRepoOf(e.url), {
			onNone: () => [],
			onSome: (urlRepo) =>
				e.repo !== undefined && sameRepo(e.repo, urlRepo)
					? []
					: [{ path: ['repo'], issue: `a GitHub url needs repo = "${urlRepo}" for the checker` }]
		}),
		...Array.flatMap(e.history, (h, i) => [
			// Projects off GitHub can be done from their official docs, with no version.
			...(h.state === 'done' && h.version === undefined && e.repo !== undefined
				? [{ path: ['history', i, 'version'], issue: 'a done block needs a version' }]
				: []),
			...Option.match(Array.get(e.history, i - 1), {
				onNone: () => [],
				onSome: (prev) =>
					Date.parse(h.date) < Date.parse(prev.date)
						? [{ path: ['history', i, 'date'], issue: 'history must be in date order' }]
						: []
			})
		])
	],
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
