import { describe, expect, it } from '@effect/vitest';
import { DateTime, Effect } from 'effect';
import { fixtureFiles, kittyToml, specToml } from './fixtures.ts';
import { loadData } from './load.ts';

const failure = (files: Record<string, string>) =>
	loadData(files, specToml).pipe(
		Effect.flip,
		Effect.map((e) => `${e.file}: ${e.message}`)
	);

describe('loadData', () => {
	it.effect('decodes good files, sorted by slug, with dates as UTC DateTimes', () =>
		Effect.gen(function* () {
			const { spec, entries } = yield* loadData(fixtureFiles, specToml);
			expect(DateTime.formatIsoDateUtc(spec.revision[0].date)).toBe('2026-10-10');
			expect(entries.map((e) => e.slug)).toEqual(['codex', 'kitty', 'rex', 'tiny']);
			const codex = entries[0]!;
			expect(codex.history.map((h) => DateTime.formatIso(h.date))).toEqual([
				'2026-10-09T01:00:00.000Z',
				'2026-10-09T05:00:00.000Z',
				'2026-10-20T10:30:00.000Z'
			]);
			expect(entries[3]!.history).toEqual([]);
		})
	);

	it.effect('rejects unknown keys and names the file', () =>
		Effect.gen(function* () {
			const msg = yield* failure({ '/data/entries/kitty.toml': `summary = "x"\n${kittyToml}` });
			expect(msg).toMatch(/^\/data\/entries\/kitty\.toml: .*summary/su);
		})
	);

	it.effect('rejects bad TOML', () =>
		Effect.gen(function* () {
			expect(yield* failure({ '/data/entries/x.toml': 'name = ' })).toMatch(/^\/data\/entries\/x/u);
		})
	);

	it.effect('rejects a bad slug', () =>
		Effect.gen(function* () {
			expect(yield* failure({ '/data/entries/Kitty.toml': kittyToml })).toMatch(/bad slug/u);
		})
	);

	const broken: Array<[string, string, RegExp]> = [
		[
			'a done block without a version',
			kittyToml.replace('state = "idle"', 'state = "done"'),
			/version/u
		],
		[
			'an impossible date',
			kittyToml.replace('last_checked_date = 2026-10-24', 'last_checked_date = "2026-02-31"'),
			/a valid date/u
		],
		[
			'an impossible time',
			kittyToml.replace('2026-10-12T08:00:00Z', '"2026-10-12T25:00:00.000Z"'),
			/date/u
		],
		[
			'a leap second in the latest block (TOML itself rejects a native one)',
			kittyToml.replace('date = 2026-10-13\n', 'date = "2026-10-13T23:59:60.000Z"\n'),
			/a valid date/u
		],
		[
			'a leap second in an earlier block',
			kittyToml.replace('2026-10-12T08:00:00Z', '"2026-10-12T23:59:60.000Z"'),
			/a valid date/u
		],
		['history out of order', kittyToml.replace('2026-10-13', '2026-10-01'), /date order/u],
		['a category from the other role', kittyToml.replace('"emulators"', '"clis"'), /category/u],
		['a GitHub url without a repo', kittyToml.replace(/^repo = .*$/mu, ''), /repo/u],
		[
			'a mixed-case GitHub url without a repo',
			kittyToml
				.replace(/^repo = .*$/mu, '')
				.replace('https://github.com/kovidgoyal/kitty"', 'https://GitHub.com/kovidgoyal/kitty"'),
			/repo/u
		],
		[
			'a repo that differs from the url',
			kittyToml.replace('repo = "kovidgoyal/kitty"', 'repo = "someone/else"'),
			/repo/u
		],
		['an unknown state', kittyToml.replace('"idle"', '"maybe"'), /state/u],
		[
			'a non-https source',
			kittyToml.replace('https://github.com/kovidgoyal/kitty/issues', 'ftp://x'),
			/source/u
		]
	];
	for (const [name, text, pattern] of broken) {
		it.effect(`rejects ${name}`, () =>
			Effect.gen(function* () {
				expect(yield* failure({ '/data/entries/kitty.toml': text })).toMatch(pattern);
			})
		);
	}

	// Unquoted, so the TOML parser sees them as dates and must reject them itself. A JS Date
	// would roll Feb 30 over to Mar 2, which could slip through as a valid date.
	const nativeDates = [
		'2026-02-30',
		'1900-02-29',
		'2026-10-12T24:00:00Z',
		'2026-02-30T10:00:00Z',
		'2026-10-12T23:59:60Z'
	];
	const invalidDate = /^\/data\/entries\/kitty\.toml: .*Invalid date-time/u;
	for (const date of nativeDates) {
		it.effect(`rejects a native ${date} in the latest block`, () =>
			Effect.gen(function* () {
				const toml = kittyToml.replace('date = 2026-10-13\n', `date = ${date}\n`);
				expect(yield* failure({ '/data/entries/kitty.toml': toml })).toMatch(invalidDate);
			})
		);
		it.effect(`rejects a native ${date} as last_checked_date`, () =>
			Effect.gen(function* () {
				const toml = kittyToml.replace(/^last_checked_date = .*$/mu, `last_checked_date = ${date}`);
				expect(yield* failure({ '/data/entries/kitty.toml': toml })).toMatch(invalidDate);
			})
		);
		it.effect(`rejects a native ${date} in an earlier block`, () =>
			Effect.gen(function* () {
				const toml = kittyToml.replace('date = 2026-10-12T08:00:00Z', `date = ${date}`);
				expect(yield* failure({ '/data/entries/kitty.toml': toml })).toMatch(invalidDate);
			})
		);
	}
});
