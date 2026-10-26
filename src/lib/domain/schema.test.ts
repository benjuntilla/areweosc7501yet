import { describe, expect, it } from '@effect/vitest';
import { Option, Schema } from 'effect';
import { githubRepoUrl } from './patterns.ts';
import { githubRepoOf, isPlainGithubUrl } from './formats.ts';
import { HistoryBlock } from './schema.ts';

const isHistoryDate = (s: string) =>
	Option.isSome(Schema.decodeUnknownOption(HistoryBlock.fields.date)(s));
const isSourceUrl = Schema.is(HistoryBlock.fields.source);

// Date-times are UTC instants in the form the loader writes native TOML date-times.
describe('history dates', () => {
	it.each([
		['2024-02-29', true],
		['2026-02-28', true],
		['2026-02-30', false],
		['2025-02-29', false],
		['1900-02-29', false],
		['2000-02-29', true],
		['2026-04-31', false],
		['2026-13-01', false],
		['2026-00-10', false],
		['2026-10-00', false],
		['2026-10-12T23:59:59.000Z', true],
		['2026-10-12T23:59:59Z', false],
		['2026-10-12T08:00:00.123+05:30', false],
		['2100-02-29', false],
		['2026-10-12T23:59:60.000Z', false],
		['2026-10-12T24:00:00.000Z', false],
		['2026-10-12T23:60:00.000Z', false],
		['2026-10-12T25:00:00.000Z', false],
		['2026-10-12T08:60:00.000Z', false],
		['2026-10-12T08:00:60.000Z', false],
		['2026-10-12T08:00:00+24:00', false],
		['2026-10-12T08:00:00+05:60', false],
		['2026-10-12T08:00:00', false]
	])('%s is %s', (s, ok) => {
		expect(isHistoryDate(s)).toBe(ok);
	});
});

describe('source URLs', () => {
	it.each([
		['https://github.com/kovidgoyal/kitty/pull/10657', true],
		['https://www.gnu.org/software/screen/', true],
		['https://#x', false],
		['https://', false],
		['https:///x', false],
		['https://a@', false],
		['https://:80', false],
		['http://example.com', false],
		['HTTPS://example.com', false],
		['ftp://example.com', false],
		['https://exa mple.com', false],
		['not a url', false]
	])('%s is %s', (s, ok) => {
		expect(isSourceUrl(s)).toBe(ok);
	});
});

describe('githubRepoOf', () => {
	it.each([
		['https://github.com/kovidgoyal/kitty', 'kovidgoyal/kitty'],
		['https://GitHub.com/kovidgoyal/kitty/', 'kovidgoyal/kitty'],
		['https://github.com/kovidgoyal/kitty.git', 'kovidgoyal/kitty'],
		['https://github.com/kovidgoyal/kitty/pull/10657', 'kovidgoyal/kitty'],
		['https://github.com/kovidgoyal', undefined],
		['https://github.com/', undefined],
		['https://codeberg.org/dnkl/foot', undefined],
		['https://www.github.com/a/b', undefined],
		['https://x@github.com/a/b', 'a/b'],
		['https://x:y@GitHub.com:443/a/b', 'a/b'],
		['https://github.com//a//b', 'a/b'],
		['https://github.com.evil.com/a/b', undefined],
		['https://github.com/a', undefined]
	])('%s is %s', (url, repo) => {
		expect(Option.getOrUndefined(githubRepoOf(url))).toBe(repo);
	});
});

describe('the published GitHub repository URL condition', () => {
	const pattern = new RegExp(githubRepoUrl, 'u');
	it.each([
		'https://github.com/kovidgoyal/kitty',
		'https://github.com/kovidgoyal/kitty/',
		'https://github.com/kovidgoyal/kitty.git',
		'https://github.com/kovidgoyal/kitty/pull/10657',
		'https://github.com/o/x?tab=readme',
		'https://github.com/a/?x',
		'https://github.com/a#x',
		'https://github.com/kovidgoyal',
		'https://github.com/',
		'https://codeberg.org/dnkl/foot',
		'https://x@github.com/a/b',
		'https://x:y@github.com:443/a/b',
		'https://github.com//a//b',
		'https://github.com.evil.com/a/b'
	])('agrees with githubRepoOf on %s', (url) => {
		expect(pattern.test(url)).toBe(Option.isSome(githubRepoOf(url)));
	});
});

describe('isPlainGithubUrl', () => {
	it.each([
		['https://github.com/kovidgoyal/kitty', true],
		['https://x@github.com/a/b', true],
		['https://x:y@github.com:443/a/b', true],
		['https://GitHub.com/a/b', false],
		['https://github.com//a//b', true],
		['https://codeberg.org/dnkl/foot', true],
		['https://github.com/a/b/../c', false],
		['https://%67ithub.com/a/b', false],
		['https://github.com/%2e%2e/x/y', false]
	])('%s is %s', (url, ok) => {
		expect(isPlainGithubUrl(url)).toBe(ok);
	});
});
