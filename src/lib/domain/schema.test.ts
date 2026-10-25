import { describe, expect, it } from '@effect/vitest';
import { Option, Schema } from 'effect';
import { githubRepoOf, HistoryBlock } from './schema.ts';

const isHistoryDate = Schema.is(HistoryBlock.fields.date);
const isSourceUrl = Schema.is(HistoryBlock.fields.source);

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
		['2026-10-12T23:59:59Z', true],
		['2026-10-12T08:00:00.123+05:30', true],
		['2100-02-29', false],
		['2026-10-12T23:59:60Z', false],
		['2026-10-12T24:00:00Z', false],
		['2026-10-12T23:60:00Z', false],
		['2026-10-12T25:00:00Z', false],
		['2026-10-12T08:60:00Z', false],
		['2026-10-12T08:00:60Z', false],
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
		['https://www.github.com/a/b', undefined]
	])('%s is %s', (url, repo) => {
		expect(Option.getOrUndefined(githubRepoOf(url))).toBe(repo);
	});
});
