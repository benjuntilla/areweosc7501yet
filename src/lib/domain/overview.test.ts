import { describe, expect, it } from '@effect/vitest';
import { Effect } from 'effect';
import { checkerToml, specToml } from './fixtures.ts';
import { loadData } from './load.ts';
import { overview, sourceLabel } from './overview.ts';
import { buildSite } from './site.ts';

const entry = (name: string, state: string, featured: boolean) => `
name = "${name}"
url = "https://example.com/${name}"
role = "program"
category = "coding-agents"
is_featured = ${featured}
spec_revision = "0.4"
last_checked_date = 2026-10-24

[[history]]
date = 2026-10-06
state = "${state}"
source = "https://example.com/${name}"
`;

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
			const files = {
				'/data/entries/beta.toml': entry('beta', 'working', true),
				'/data/entries/zeta.toml': entry('zeta', 'done', true),
				'/data/entries/alpha.toml': entry('alpha', 'working', true),
				'/data/entries/gamma.toml': entry('gamma', 'idle', false),
				'/data/entries/delta.toml': entry('delta', 'done', false)
			};
			const roles = overview(buildSite(yield* loadData(files, specToml, checkerToml)));
			const categories = roles.flatMap((r) => r.categories);
			const agents = categories.find((c) => c.id === 'coding-agents');
			expect(agents?.featured.map((c) => c.name)).toEqual(['zeta', 'alpha', 'beta']);
			expect(agents?.more.map((c) => c.name)).toEqual(['delta', 'gamma']);
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
