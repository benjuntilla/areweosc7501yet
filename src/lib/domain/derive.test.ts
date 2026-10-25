import { describe, expect, it } from '@effect/vitest';
import {
	changeRows,
	isFeatured,
	sentenceOf,
	stateStart,
	summarize,
	verdictOf,
	weekStart
} from './derive.ts';
import type { SlugEntry } from './load.ts';
import type { HistoryBlock } from './schema.ts';

const entry = (over: Partial<SlugEntry> = {}): SlugEntry => ({
	slug: 'x',
	name: 'X',
	url: 'https://github.com/o/x',
	repo: 'o/x',
	role: 'program',
	category: 'coding-agents',
	spec_revision: '0.4',
	last_checked_date: '2026-10-24',
	history: [],
	...over
});
const block = (
	date: string,
	state: HistoryBlock['state'],
	source = 'https://example.com/post',
	version?: string
): HistoryBlock => ({ date, state, source, ...(version === undefined ? {} : { version }) });

describe('featured', () => {
	it('uses 1,000 stars by default', () => {
		expect(isFeatured(entry({ github: { stars: 999 } }))).toBe(false);
		expect(isFeatured(entry({ github: { stars: 1000 } }))).toBe(true);
		expect(isFeatured(entry())).toBe(false);
	});
	it('lets is_featured override the stars either way', () => {
		expect(isFeatured(entry({ is_featured: true }))).toBe(true);
		expect(isFeatured(entry({ is_featured: false, github: { stars: 90000 } }))).toBe(false);
	});
});

describe('verdict ladder', () => {
	it.each([
		[0, 'No'],
		[0.099, 'No'],
		[0.1, 'Hardly'],
		[0.349, 'Hardly'],
		[0.35, 'Halfway'],
		[0.649, 'Halfway'],
		[0.65, 'Almost'],
		[0.899, 'Almost'],
		[0.9, 'Yes'],
		[1, 'Yes']
	])('%f is %s', (score, word) => expect(verdictOf(score)).toBe(word));

	it('scores featured entries, half for working, without libraries and engines', () => {
		const featured = { github: { stars: 5000 } };
		const s = summarize(
			[
				entry({ ...featured, history: [block('2026-10-08', 'done', 'https://x', 'v1')] }),
				entry({ ...featured, history: [block('2026-10-08', 'working')] }),
				entry({ ...featured }),
				entry({ ...featured, category: 'libraries', history: [block('2026-10-08', 'working')] }),
				entry({ history: [block('2026-10-08', 'done', 'https://x', 'v1')] }),
				entry({ ...featured, role: 'terminal', category: 'emulators' })
			],
			'program'
		);
		expect(s).toEqual({
			role: 'program',
			verdict: 'Halfway',
			score: 0.5,
			done: 1,
			working: 1,
			featured: 3
		});
	});
});

describe('history', () => {
	it('starts the current state at its first block', () => {
		const e = entry({
			history: [
				block('2026-10-09', 'idle'),
				block('2026-10-12', 'working'),
				block('2026-10-13', 'working')
			]
		});
		expect(stateStart(e)?.date).toBe('2026-10-12');
		expect(stateStart(entry())).toBeUndefined();
	});

	it('skips evidence-only blocks and idle additions', () => {
		const rows = changeRows(
			entry({
				history: [
					block('2026-10-09', 'idle'),
					block('2026-10-12', 'working', 'https://github.com/o/x/pull/1'),
					block('2026-10-13', 'working', 'https://github.com/o/x/commit/abc'),
					block('2026-10-20', 'done', 'https://github.com/o/x/releases/tag/v1', 'v1')
				]
			})
		);
		expect(rows.map((r) => [r.day, r.from, r.to, r.source])).toEqual([
			['2026-10-12', 'idle', 'working', 'https://github.com/o/x/pull/1'],
			['2026-10-20', 'working', 'done', 'https://github.com/o/x/releases/tag/v1']
		]);
	});

	it('collapses steps on the same UTC day into one row', () => {
		const rows = changeRows(
			entry({
				history: [
					block('2026-10-09T01:00:00Z', 'idle'),
					block('2026-10-09T05:00:00Z', 'working', 'https://github.com/o/x/pull/1'),
					block('2026-10-09T23:00:00Z', 'working', 'https://github.com/o/x/commit/abc'),
					// Oct 10 in UTC, even though it's Oct 9 in California.
					block('2026-10-10T02:00:00Z', 'done', 'https://github.com/o/x/releases/tag/v1', 'v1')
				]
			})
		);
		expect(rows.map((r) => [r.day, r.from, r.to, r.source])).toEqual([
			['2026-10-09', undefined, 'working', 'https://github.com/o/x/pull/1'],
			['2026-10-10', 'working', 'done', 'https://github.com/o/x/releases/tag/v1']
		]);
	});

	it('drops a day that ends where it started', () => {
		const rows = changeRows(
			entry({
				history: [
					block('2026-10-09', 'working'),
					block('2026-10-11T01:00:00Z', 'blocked'),
					block('2026-10-11T09:00:00Z', 'working')
				]
			})
		);
		expect(rows.map((r) => r.to)).toEqual(['working']);
	});

	it('groups days into Monday-start UTC weeks', () => {
		expect(weekStart('2026-10-12')).toBe('2026-10-12');
		expect(weekStart('2026-10-18')).toBe('2026-10-12');
		expect(weekStart('2026-10-19')).toBe('2026-10-19');
	});
});

describe('popover sentence', () => {
	const one = (b: HistoryBlock, over: Partial<SlugEntry> = {}) =>
		sentenceOf(entry({ history: [b], ...over }));

	it.each([
		[block('2026-10-08', 'done', 'https://x', 'v2.1.295'), 'Shipped in v2.1.295 on Oct 8.'],
		[
			block('2026-10-12', 'working', 'https://github.com/o/x/pull/13994'),
			'PR #13994 has been open since Oct 12.'
		],
		[block('2026-10-07T18:03:00Z', 'working', 'https://x.com/post'), 'Announced on Oct 7.'],
		[
			block('2026-10-13', 'blocked', 'https://github.com/o/x/issues/5'),
			'The maintainer closed the request on Oct 13 without adding support.'
		],
		[
			block('2026-10-10', 'idle', 'https://github.com/o/x/issues/7'),
			'No code yet. The request has been open since Oct 10.'
		],
		[block('2026-10-10', 'idle', 'https://example.com/docs'), 'No code yet.'],
		[
			block('2026-10-09', 'error', 'https://github.com/o/x/pull/9'),
			'The implementation PR was closed on Oct 9 without merging.'
		]
	])('%o', (b, sentence) => expect(one(b)).toBe(sentence));

	it('says docs when done has no version', () => {
		expect(
			one(block('2026-10-06', 'done', 'https://docs'), { repo: undefined, url: 'https://docs' })
		).toBe('In its official docs since Oct 6.');
	});

	it('names the latest release for a merged commit, when there is one', () => {
		const merged = block('2026-10-13', 'working', 'https://github.com/o/x/commit/0e1b7f4');
		expect(one(merged, { github: { stars: 1, latest_release_tag: 'v0.49.2' } })).toBe(
			'Merged on Oct 13, not in a release yet. Latest is v0.49.2.'
		);
		expect(one(merged)).toBe('Merged on Oct 13, not in a release yet.');
	});

	it('says no code yet with no history', () => {
		expect(sentenceOf(entry())).toBe('No code yet.');
	});
});
