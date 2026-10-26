import { DateTime, Option } from 'effect';
import { describe, expect, it } from '@effect/vitest';
import {
	changeRows,
	isFeatured,
	ladderRows,
	sentenceOf,
	stateStart,
	summarize,
	verdictOf
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
	last_checked_date: DateTime.makeUnsafe('2026-10-24'),
	history: [],
	...over
});
const block = (
	date: string,
	state: HistoryBlock['state'],
	source = 'https://example.com/post',
	version?: string
): HistoryBlock => ({
	date: DateTime.makeUnsafe(date),
	state,
	source,
	...(version === undefined ? {} : { version })
});

describe('featured', () => {
	it('features popular projects by default', () => {
		expect(isFeatured(entry({ github: { popular: false } }))).toBe(false);
		expect(isFeatured(entry({ github: { popular: true } }))).toBe(true);
		expect(isFeatured(entry())).toBe(false);
	});
	it('lets is_featured override popular either way', () => {
		expect(isFeatured(entry({ is_featured: true }))).toBe(true);
		expect(isFeatured(entry({ is_featured: false, github: { popular: true } }))).toBe(false);
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
	])('%f is %s', (score, word) => {
		expect(verdictOf(score)).toBe(word);
	});

	it('writes the ladder as ranges, lowest first', () => {
		expect(ladderRows).toEqual([
			{ range: 'Under 10%', word: 'No' },
			{ range: '10 to under 35%', word: 'Hardly' },
			{ range: '35 to under 65%', word: 'Halfway' },
			{ range: '65 to under 90%', word: 'Almost' },
			{ range: '90% and up', word: 'Yes' }
		]);
	});

	it('scores featured entries, half for working, without libraries and engines', () => {
		const featured = { github: { popular: true } };
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
		expect(Option.map(stateStart(e), (b) => DateTime.formatIsoDateUtc(b.date))).toEqual(
			Option.some('2026-10-12')
		);
		expect(Option.isNone(stateStart(entry()))).toBe(true);
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
});

/** The block, then an evidence-only copy of it on a later day. */
const later = (b: HistoryBlock) => [b, { ...b, date: DateTime.makeUnsafe('2026-10-20') }];

const one = (b: HistoryBlock, over: Partial<SlugEntry> = {}) =>
	sentenceOf(entry({ history: [b], ...over }));

describe('popover sentence', () => {
	it.each([
		[block('2026-10-08', 'done', 'https://x', 'v2.1.295'), 'Shipped in v2.1.295 on Oct 8.'],
		[
			block('2026-10-12', 'working', 'https://github.com/o/x/pull/13994'),
			'PR #13994 has been open since Oct 12.'
		],
		[
			block('2026-10-13', 'working', 'https://github.com/o/x/commit/0e1b7f4'),
			'Merged on Oct 13, not in a release yet.'
		],
		[block('2026-10-07T18:03:00Z', 'working', 'https://x.com/post'), 'Announced on Oct 7.'],
		[
			block('2026-10-13', 'error', 'https://github.com/o/x/issues/5'),
			'The maintainer closed the request on Oct 13 without adding support.'
		],
		[
			block('2026-10-10', 'idle', 'https://github.com/o/x/issues/7'),
			'No code yet. The request has been open since Oct 10.'
		],
		[block('2026-10-10', 'idle', 'https://example.com/docs'), 'No code yet.'],
		[
			block('2026-10-09', 'blocked', 'https://github.com/o/x/pull/9'),
			'The implementation PR was closed on Oct 9 without merging.'
		]
	])('%o', (b, sentence) => {
		expect(one(b)).toBe(sentence);
	});

	it('says docs when done has no version', () => {
		// An entry off GitHub has no repo key at all.
		const { repo: _repo, ...offGithub } = entry({ url: 'https://docs' });
		expect(
			sentenceOf({ ...offGithub, history: [block('2026-10-06', 'done', 'https://docs')] })
		).toBe('In its official docs since Oct 6.');
	});

	it('dates an open PR or request from when its source was first cited', () => {
		const pr = 'https://github.com/o/x/pull/7';
		const issue = 'https://github.com/o/x/issues/3';
		expect(
			sentenceOf(
				entry({ history: [block('2026-10-12', 'working', pr), block('2026-10-20', 'working', pr)] })
			)
		).toBe('PR #7 has been open since Oct 12.');
		expect(
			sentenceOf(
				entry({ history: [block('2026-10-10', 'idle', issue), block('2026-10-18', 'idle', issue)] })
			)
		).toBe('No code yet. The request has been open since Oct 10.');
	});

	it('dates closed, errored, docs and announced states from the start of their run', () => {
		expect(
			sentenceOf(
				entry({ history: later(block('2026-10-13', 'error', 'https://github.com/o/x/issues/5')) })
			)
		).toBe('The maintainer closed the request on Oct 13 without adding support.');
		expect(
			sentenceOf(
				entry({ history: later(block('2026-10-09', 'blocked', 'https://github.com/o/x/pull/9')) })
			)
		).toBe('The implementation PR was closed on Oct 9 without merging.');
		expect(
			sentenceOf(entry({ history: later(block('2026-10-07', 'working', 'https://x.com/post')) }))
		).toBe('Announced on Oct 7.');
		const { repo: _repo, ...offGithub } = entry({ url: 'https://docs' });
		expect(
			sentenceOf({ ...offGithub, history: later(block('2026-10-06', 'done', 'https://docs')) })
		).toBe('In its official docs since Oct 6.');
	});

	it('says no code yet with no history', () => {
		expect(sentenceOf(entry())).toBe('No code yet.');
	});
});
