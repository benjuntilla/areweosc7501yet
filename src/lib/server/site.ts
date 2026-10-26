import { Effect } from 'effect';
import { loadData } from '../domain/load.ts';
import { buildSite, type Site } from '../domain/site.ts';
import specText from '../../../data/spec.toml?raw';

const entries: Record<string, string> = import.meta.glob('/data/entries/*.toml', {
	query: '?raw',
	import: 'default',
	eager: true
});

// Loaded, decoded and derived on first use, then reused for the rest of the build.
const site = Effect.runSync(Effect.cached(loadData(entries, specText).pipe(Effect.map(buildSite))));

/** The derived site. A bad data file fails the build. */
export const getSite = (): Promise<Site> => Effect.runPromise(site);
