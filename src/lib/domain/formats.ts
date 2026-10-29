import { Array, DateTime, Equivalence, Option, Schema, SchemaTransformation, String } from 'effect';
import * as patterns from './patterns.ts';

// The published JSON Schema only names each format, for Tombi. The decoder is stricter: a URL
// must parse, and a date must come back unchanged from Effect's DateTime, so a quoted Feb 30
// fails here like a native one fails in the TOML parser.

/** A calendar day, like 2026-10-13, decoded to midnight UTC. */
export const Day = Schema.String.check(
	Schema.isPattern(patterns.day, {
		expected: 'a TOML date, like 2026-10-13',
		toJsonSchema: () => ({ format: 'date' })
	}),
	Schema.makeFilter(
		(s) => Option.exists(DateTime.make(s), (d) => DateTime.formatIsoDateUtc(d) === s),
		{ expected: 'a valid date', toJsonSchema: () => ({}) }
	)
).pipe(
	Schema.decodeTo(
		Schema.DateTimeUtc,
		SchemaTransformation.transform({
			decode: (s) => DateTime.makeUnsafe(s),
			encode: DateTime.formatIsoDateUtc
		})
	)
);

/** A UTC instant, in the form the loader writes native TOML date-times. */
const Instant = Schema.String.check(
	Schema.isPattern(patterns.instant, {
		expected: 'a TOML date-time with an offset, like 2026-10-12T08:00:00Z',
		toJsonSchema: () => ({ format: 'date-time' })
	}),
	Schema.makeFilter((s) => Option.exists(DateTime.make(s), (d) => DateTime.formatIso(d) === s), {
		expected: 'a valid date-time',
		toJsonSchema: () => ({})
	})
).pipe(
	Schema.decodeTo(
		Schema.DateTimeUtc,
		SchemaTransformation.transform({
			decode: (s) => DateTime.makeUnsafe(s),
			encode: DateTime.formatIso
		})
	)
);

// Instant first, so encoding writes the full instant.
export const DayOrTime = Schema.Union([Instant, Day]);

/** An https URL with a host that URL parses, written only in RFC 3986 characters. */
export const Url = Schema.String.check(
	Schema.isPattern(new RegExp(patterns.httpsUrl, 'u'), {
		expected: 'an https URL with a host',
		toJsonSchema: () => ({ format: 'uri', pattern: patterns.httpsUrl })
	}),
	Schema.makeFilter(
		(s) =>
			Option.isSome(Schema.decodeUnknownOption(Schema.URLFromString)(s)) &&
			patterns.uriCharacters.test(s),
		{ expected: 'an https URL with a host', toJsonSchema: () => ({}) }
	)
);
export const Repo = Schema.String.check(Schema.isPattern(patterns.repo));

const githubItem = [
	'/',
	Repo,
	'/',
	Schema.Literals(['pull', 'issues', 'commit']),
	'/',
	Schema.String.check(Schema.isPattern(/^\w+$/u))
] as const;

/** The path of a link to one item in a GitHub repository, like /owner/name/pull/123 or a page under it. */
export const GitHubItemPath = Schema.Union([
	Schema.TemplateLiteralParser(githubItem),
	Schema.TemplateLiteralParser([...githubItem, '/', Schema.String])
]);

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

export const sameRepo = Equivalence.mapInput(Equivalence.String, (s: string) =>
	String.toLowerCase(s)
);
