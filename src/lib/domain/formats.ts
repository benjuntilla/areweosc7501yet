import { Array, DateTime, Equivalence, Option, Schema, SchemaTransformation, String } from 'effect';
import * as patterns from './patterns.ts';

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
export const Day = dateTime(
	patterns.day,
	'date',
	'a valid date',
	'a TOML date, like 2026-10-13',
	DateTime.formatIsoDateUtc
);
/** A UTC instant, in the form the loader writes native TOML date-times. */
const Instant = dateTime(
	patterns.instant,
	'date-time',
	'a valid date-time',
	'a TOML date-time with an offset, like 2026-10-12T08:00:00Z',
	DateTime.formatIso
);
// Instant first, so encoding writes the full instant.
export const DayOrTime = Schema.Union([Instant, Day]);
// URL itself must parse it, and only RFC 3986 characters may appear.
const isUrl = (s: string) => Option.isSome(Schema.decodeUnknownOption(Schema.URLFromString)(s));
export const Url = formatted(
	new RegExp(patterns.httpsUrl, 'u'),
	{ format: 'uri', pattern: patterns.httpsUrl },
	'an https URL with a host',
	(s) => isUrl(s) && patterns.uriCharacters.test(s)
);
export const Repo = Schema.String.check(Schema.isPattern(patterns.repo));

/** owner/name when the URL is a GitHub repository (or a page inside one). */
export const githubRepoOf = (url: string): Option.Option<string> =>
	Option.flatMap(
		Schema.decodeUnknownOption(Schema.URLFromString)(url),
		({ hostname, pathname }) => {
			if (String.toLowerCase(hostname) !== 'github.com') return Option.none();
			const [owner, name] = Array.filter(String.split(pathname, '/'), String.isNonEmpty);
			return owner === undefined || name === undefined
				? Option.none()
				: Option.some(`${owner}/${String.replace(/\.git$/u, '')(name)}`);
		}
	);

// JSON Schema can't parse URLs, so the published repo rule reads the raw text. The decoder
// rejects URLs where it and githubRepoOf disagree.
const githubRepoUrl = new RegExp(patterns.githubRepoUrl, 'u');
const githubRepoByPattern = (url: string): Option.Option<string> =>
	Option.map(
		String.match(githubRepoUrl)(url),
		([, , , owner, name]) => `${owner}/${String.replace(/\.git$/u, '')(name ?? '')}`
	);

export const sameRepo = Equivalence.mapInput(Equivalence.String, (s: string) =>
	String.toLowerCase(s)
);

/** True when the published pattern reads the same repo as githubRepoOf, or neither sees one. */
export const isPlainGithubUrl = (url: string): boolean =>
	Option.makeEquivalence(sameRepo)(githubRepoOf(url), githubRepoByPattern(url));
