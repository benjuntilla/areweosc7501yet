import { describe, expect, it } from '@effect/vitest';
import { Effect } from 'effect';
import { checkerToml, fixtureFiles, specToml } from './fixtures.ts';
import { loadData } from './load.ts';
import { overview, sourceLabel } from './overview.ts';
import { buildSite } from './site.ts';

describe('overview', () => {
	it('names sources by repo', () => {
		expect(sourceLabel('https://github.com/kovidgoyal/kitty/commit/0e1b7f4812bf2976')).toBe(
			'kovidgoyal/kitty@0e1b7f4'
		);
		expect(sourceLabel('https://github.com/sxyazi/yazi/pull/13994')).toBe('sxyazi/yazi#13994');
		expect(sourceLabel('https://github.com/a/b/issues/7')).toBe('a/b#7');
		expect(sourceLabel('https://github.com/a/b/releases/tag/v1.2.3')).toBe('a/b v1.2.3');
		expect(sourceLabel('https://www.superlogical.com/rex/docs')).toBe('superlogical.com/rex/docs');
	});

	it.effect('puts featured chips first, by state then name, and folds the rest', () =>
		Effect.gen(function* () {
			const roles = overview(buildSite(yield* loadData(fixtureFiles, specToml, checkerToml)));
			const categories = roles.flatMap((r) => r.categories);
			for (const c of categories) {
				const order = ['done', 'working', 'blocked', 'idle', 'error'];
				const ranks = c.featured.map((chip) => order.indexOf(chip.state));
				expect(ranks).toEqual(ranks.toSorted((a, b) => a - b));
			}
			expect(categories.map((c) => c.id)).toEqual([
				'coding-agents',
				'clis',
				'libraries',
				'emulators',
				'multiplexers',
				'engines'
			]);
		})
	);
});
