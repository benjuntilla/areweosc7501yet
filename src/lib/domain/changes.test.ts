import { expect, it } from '@effect/vitest';
import { Effect } from 'effect';
import { changeWeeks } from './changes.ts';
import { checkerToml, fixtureFiles, specToml } from './fixtures.ts';
import { loadData } from './load.ts';
import { buildSite } from './site.ts';

it.effect('groups change rows and spec revisions into Monday-start weeks, newest first', () =>
	Effect.gen(function* () {
		expect(
			changeWeeks(buildSite(yield* loadData(fixtureFiles, specToml, checkerToml)))
		).toMatchSnapshot();
	})
);
