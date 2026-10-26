import { Array, DateTime, Equivalence, Option, Schema, SchemaTransformation, String } from 'effect';

export const states = ['done', 'working', 'blocked', 'idle', 'error'] as const;
export type State = (typeof states)[number];

export const roles = ['program', 'terminal'] as const;
export type Role = (typeof roles)[number];

export const categoriesByRole = {
	program: ['coding-agents', 'clis', 'libraries'],
	terminal: ['emulators', 'multiplexers', 'engines']
} as const;
export type Category = (typeof categoriesByRole)[Role][number];

// The published JSON Schema describes dates and URLs with `format` (TOML writes dates as
// native dates, which is what Tombi checks). The decoder is stricter: a URL must parse, and a
// date must come back unchanged from Effect's DateTime, so a quoted Feb 30 fails here like a
// native one fails in the TOML parser.
const formatted = (
	pattern: RegExp,
	jsonSchema: { readonly format: string; readonly pattern?: string },
	expected: string,
	valid: (s: string) => boolean,
	form = expected
) =>
	Schema.String.check(
		Schema.isPattern(pattern, { expected: form, toJsonSchema: () => jsonSchema }),
		Schema.makeFilter(valid, { expected, toJsonSchema: () => ({}) })
	);

/** A date string that decodes to a DateTime.Utc and encodes back with `text`. */
const dateTime = (
	pattern: RegExp,
	format: string,
	expected: string,
	form: string,
	text: (d: DateTime.DateTime) => string
) =>
	formatted(
		pattern,
		{ format },
		expected,
		(s) => Option.exists(DateTime.make(s), (d) => text(d) === s),
		form
	).pipe(
		Schema.decodeTo(
			Schema.DateTimeUtc,
			SchemaTransformation.transform({ decode: (s) => DateTime.makeUnsafe(s), encode: text })
		)
	);

/** A calendar day, like 2026-10-13. */
const Day = dateTime(
	/^\d{4}-\d{2}-\d{2}$/u,
	'date',
	'a valid date',
	'a TOML date, like 2026-10-13',
	DateTime.formatIsoDateUtc
);
/** A UTC instant, in the form the loader writes native TOML date-times. */
const Instant = dateTime(
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u,
	'date-time',
	'a valid date-time',
	'a TOML date-time with an offset, like 2026-10-12T08:00:00Z',
	DateTime.formatIso
);
// Instant first, so encoding writes the full instant.
const DayOrTime = Schema.Union([Instant, Day]);
// URL patterns, as JSON Schema regex source. Each optional part is one group, so the GitHub
// pattern's owner and name are groups 3 and 4.
const userinfo = '([^/?#\\s@]*@)?';
const host = '[^/?#\\s@:]+';
const port = '(:[0-9]*)?';
/** The end of the URL, or the start of a path, query or fragment. */
const end = '([/?#]|$)';
/** A path segment, after one or more slashes. */
const segment = '/+([^/?#]+)';
/** `text` in any letter case, with regex characters escaped. */
const anyCase = (text: string) =>
	Array.map(String.split(text, ''), (c) =>
		/[a-z]/u.test(c) ? `[${String.toUpperCase(c)}${c}]` : `\\${c}`
	).join('');

// A lowercase https scheme, optional userinfo, a nonempty host and an optional port, then
// the end or a path, query or fragment. URL itself must parse it, and only RFC 3986
// characters may appear (URL would quietly encode spaces or quotes).
const urlPattern = `^https://${userinfo}${host}${port}${end}`;
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

/**
 * A github.com URL (any letter case, optional userinfo and port) with owner and name path
 * segments, as the JSON Schema publishes it. JSON Schema can't parse URLs, so this reads the
 * raw text, and the decoder rejects URLs where it and githubRepoOf disagree.
 */
export const githubRepoUrlPattern = `^https://${userinfo}${anyCase('github.com')}${port}${segment}${segment}${end}`;
const githubRepoUrl = new RegExp(githubRepoUrlPattern, 'u');
const githubRepoByPattern = (url: string): Option.Option<string> =>
	Option.map(
		String.match(githubRepoUrl)(url),
		([, , , owner, name]) => `${owner}/${String.replace(/\.git$/u, '')(name ?? '')}`
	);

const sameRepo = Equivalence.mapInput(Equivalence.String, (s: string) => String.toLowerCase(s));

/** True when the published pattern reads the same repo as githubRepoOf, or neither sees one. */
export const isPlainGithubUrl = (url: string): boolean =>
	Option.makeEquivalence(sameRepo)(githubRepoOf(url), githubRepoByPattern(url));

const describe =
	<S extends Schema.Top>(description: string) =>
	(s: S) =>
		Schema.annotateEncoded<S>({ description })(s);

export const HistoryBlock = Schema.Struct({
	date: DayOrTime.pipe(describe('When the state or its evidence changed. A date-time is in UTC.')),
	state: Schema.Literals(states).pipe(describe('The state from this date on.')),
	source: Url.pipe(describe('The PR, commit, release, issue or docs page that shows this state.')),
	version: Schema.optionalKey(
		Schema.String.pipe(
			describe('The release that shipped support. Required for done when the entry has a repo.')
		)
	)
});
export type HistoryBlock = typeof HistoryBlock.Type;

export const Github = Schema.Struct({
	stars: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
	latest_release_tag: Schema.optionalKey(Schema.String),
	latest_release_date: Schema.optionalKey(Day)
}).pipe(describe("Written by the weekly checker. Don't edit it by hand."));

export const entryFields = {
	name: Schema.String.pipe(describe("The project's name, as the site shows it.")),
	url: Url.pipe(describe("The project's homepage, or its repository if it has no homepage.")),
	repo: Schema.optionalKey(
		Repo.pipe(
			describe(
				"The GitHub owner/name that the weekly checker watches. Leave it out for projects that aren't on GitHub."
			)
		)
	),
	role: Schema.Literals(roles).pipe(
		describe('program if it sends status reports, terminal if it shows them.')
	),
	category: Schema.Literals([...categoriesByRole.program, ...categoriesByRole.terminal]),
	is_featured: Schema.optionalKey(
		Schema.Boolean.pipe(
			describe(
				'Set true to feature an entry with fewer than 1,000 stars, or false to hide one with more. Leave it out to go by stars.'
			)
		)
	),
	aliases: Schema.optionalKey(
		Schema.Array(Schema.String).pipe(
			describe('Other names that search should match, such as agentd for agtd.')
		)
	),
	spec_revision: Schema.String.pipe(
		describe('The OSC 7501 spec revision of the last check, such as 0.4.')
	),
	note: Schema.optionalKey(
		Schema.String.pipe(describe('A caveat that the popover shows, such as how to turn support on.'))
	),
	last_checked_date: Day,
	github: Schema.optionalKey(Github),
	history: Schema.Array(HistoryBlock).pipe(
		describe(
			'State changes, oldest first. The last block is the current state, and no blocks means idle.'
		)
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
		...(isPlainGithubUrl(e.url)
			? []
			: [{ path: ['url'], issue: 'write the GitHub URL in its plain form' }]),
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
					DateTime.isLessThan(h.date, prev.date)
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
