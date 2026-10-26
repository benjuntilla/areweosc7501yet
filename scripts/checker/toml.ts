import { Effect, Schema } from 'effect';
import { Entry, entryFields, Github, HistoryBlock } from '../../src/lib/domain/schema.ts';

const dateKeys = new Set(['last_checked_date', 'latest_release_date', 'date']);

// Dates decode to DateTimes, so a hand-written day comes back as midnight UTC, and date-times
// gain milliseconds the files don't have.
// ponytail: an instant at exactly midnight UTC is written as a day
const date = (v: string) => v.replace(/T00:00:00\.000Z$/u, '').replace(/\.000Z$/u, 'Z');

// JSON escapes every control character TOML bans except DEL.
const str = (v: unknown) => JSON.stringify(v).replaceAll('\u007F', '\\u007F');

const value = (key: string, v: unknown): string => {
	if (typeof v === 'string') return dateKeys.has(key) ? date(v) : str(v);
	if (Array.isArray(v)) return `[${v.map((x) => str(x)).join(', ')}]`;
	return String(v);
};

const pairs = (keys: ReadonlyArray<string>, o: Readonly<Record<string, unknown>>) =>
	keys
		.filter((k) => o[k] !== undefined)
		.map((k) => `${k} = ${value(k, o[k])}`)
		.join('\n');

const topKeys = Object.keys(entryFields).filter((k) => k !== 'github' && k !== 'history');

// An empty history has no tables to hold it, so it sits with the top-level keys.
const top = (e: typeof Entry.Encoded) =>
	pairs(e.history.length === 0 ? [...topKeys, 'history'] : topKeys, e);

/** An entry file in schema key order. oxfmt has the last word on layout. */
export const writeEntry = (entry: Entry) =>
	Schema.encodeEffect(Entry)(entry).pipe(
		Effect.map((e) => {
			const sections = [
				top(e),
				...(e.github === undefined
					? []
					: [`[github]\n${pairs(Object.keys(Github.fields), e.github)}`]),
				...e.history.map((h) => `[[history]]\n${pairs(Object.keys(HistoryBlock.fields), h)}`)
			];
			return `${sections.join('\n\n')}\n`;
		})
	);
