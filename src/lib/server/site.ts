import { Effect } from 'effect';
import { loadData } from '../domain/load.ts';
import { buildSite, type Site } from '../domain/site.ts';
import specText from '../../../data/spec.toml?raw';

const entries: Record<string, string> = import.meta.glob('/data/entries/*.toml', {
	query: '?raw',
	import: 'default',
	eager: true
});

let site: Promise<Site> | undefined;

/** Loads, decodes and derives the data once per build. A bad file fails the build. */
export const getSite = (): Promise<Site> =>
	(site ??= Effect.runPromise(loadData(entries, specText).pipe(Effect.map(buildSite))));
