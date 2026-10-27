import { expect, it } from '@effect/vitest';
import { Effect } from 'effect';
import { toAtom } from './feed.ts';
import { checkerToml, fixtureFiles, specToml } from './fixtures.ts';
import { loadData } from './load.ts';
import { buildSite } from './site.ts';

it.effect('writes the change rows and spec revisions as Atom, newest first', () =>
	Effect.gen(function* () {
		const site = buildSite(yield* loadData(fixtureFiles, specToml, checkerToml));
		expect(toAtom(site)).toMatchSnapshot();
	})
);
