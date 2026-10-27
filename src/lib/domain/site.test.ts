import { describe, expect, it } from '@effect/vitest';
import { Array, DateTime, Effect, Schema } from 'effect';
import { checkerToml, fixtureFiles, specToml } from './fixtures.ts';
import { loadData } from './load.ts';
import { buildSite, DataJson, toDataJson } from './site.ts';

describe('site', () => {
	it.effect('builds change rows from featured entries, newest first', () =>
		Effect.gen(function* () {
			const site = buildSite(yield* loadData(fixtureFiles, specToml, checkerToml));
			expect(
				Array.map(site.changes, (r) => ({ ...r, date: DateTime.formatIso(r.date) }))
			).toMatchSnapshot('change rows');
		})
	);

	it.effect('builds a data.json that matches its own schema', () =>
		Effect.gen(function* () {
			const site = buildSite(yield* loadData(fixtureFiles, specToml, checkerToml));
			const json = toDataJson(site, DateTime.makeUnsafe('2026-10-24T14:00:00Z'));
			yield* Schema.decodeUnknownEffect(DataJson, { onExcessProperty: 'error' })(json);
			expect(json).toMatchSnapshot('data.json');
		})
	);
});
