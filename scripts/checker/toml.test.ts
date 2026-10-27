import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from '@effect/vitest';
import { DateTime, Effect } from 'effect';
import { specToml } from '../../src/lib/domain/fixtures.ts';
import { loadData, type SlugEntry } from '../../src/lib/domain/load.ts';
import type { Entry, HistoryBlock } from '../../src/lib/domain/schema.ts';
import { writeEntry } from './toml.ts';

const pr = 'https://github.com/kovidgoyal/kitty/pull/10657';
const working = (date: string): HistoryBlock => ({
	date: DateTime.makeUnsafe(date),
	state: 'working',
	source: pr
});

const kitty: Entry = {
	name: 'kitty',
	url: 'https://sw.kovidgoyal.net/kitty/',
	repo: 'kovidgoyal/kitty',
	role: 'terminal',
	category: 'emulators',
	spec_revision: '0.4',
	last_checked_date: DateTime.makeUnsafe('2026-10-24'),
	history: []
};

const kittyToml = `name = "kitty"
url = "https://sw.kovidgoyal.net/kitty/"
repo = "kovidgoyal/kitty"
role = "terminal"
category = "emulators"
spec_revision = "0.4"
last_checked_date = 2026-10-24
history = []
`;

describe('writeEntry', () => {
	it.effect('writes an entry as a TOML file', () =>
		Effect.gen(function* () {
			const text = yield* writeEntry({
				...kitty,
				github: {
					stars: 35419,
					latest_release_tag: 'v0.49.2',
					latest_release_date: DateTime.makeUnsafe('2026-10-01')
				},
				history: [
					working('2026-10-12'),
					{ date: DateTime.makeUnsafe('2026-10-13T03:58:18Z'), state: 'blocked', source: pr }
				]
			});
			expect(text).toBe(`name = "kitty"
url = "https://sw.kovidgoyal.net/kitty/"
repo = "kovidgoyal/kitty"
role = "terminal"
category = "emulators"
spec_revision = "0.4"
last_checked_date = 2026-10-24

[github]
stars = 35419
latest_release_tag = "v0.49.2"
latest_release_date = 2026-10-01

[[history]]
date = 2026-10-12
state = "working"
source = "https://github.com/kovidgoyal/kitty/pull/10657"

[[history]]
date = 2026-10-13T03:58:18Z
state = "blocked"
source = "https://github.com/kovidgoyal/kitty/pull/10657"
`);
		})
	);

	it.effect('writes the fields in schema order, whatever order they come in', () =>
		Effect.gen(function* () {
			const reversed: Entry = {
				history: [],
				last_checked_date: DateTime.makeUnsafe('2026-10-24'),
				spec_revision: '0.4',
				category: 'emulators',
				role: 'terminal',
				repo: 'kovidgoyal/kitty',
				url: 'https://sw.kovidgoyal.net/kitty/',
				name: 'kitty'
			};
			expect(yield* writeEntry(reversed)).toBe(kittyToml);
		})
	);

	it.effect('leaves out the slug that loadData adds', () =>
		Effect.gen(function* () {
			const loaded: SlugEntry = { slug: 'kitty', ...kitty };
			expect(yield* writeEntry(loaded)).toBe(kittyToml);
		})
	);

	it.effect('writes midnight UTC as a day, which reads back as the same instant', () =>
		Effect.gen(function* () {
			const text = yield* writeEntry({ ...kitty, history: [working('2026-10-13T00:00:00Z')] });
			expect(text).toContain('\ndate = 2026-10-13\n');
		})
	);

	it.effect('keeps the milliseconds of an instant', () =>
		Effect.gen(function* () {
			const text = yield* writeEntry({ ...kitty, history: [working('2026-10-13T03:58:18.120Z')] });
			expect(text).toContain('\ndate = 2026-10-13T03:58:18.12Z\n');
		})
	);

	it.effect('escapes a note so it reads back the same', () =>
		Effect.gen(function* () {
			const note = 'say "hi" \\ a\u007Fb\nnext line';
			const text = yield* writeEntry({ ...kitty, note });
			expect(text).toContain(String.raw`note = "say \"hi\" \\ a\u007Fb\nnext line"`);
			const again = yield* loadData({ '/data/entries/kitty.toml': text }, specToml);
			expect(again.entries[0]!.note).toBe(note);
		})
	);

	it.effect('writes every entry file back byte for byte', () =>
		Effect.gen(function* () {
			const dir = 'data/entries';
			const files = Object.fromEntries(
				readdirSync(dir).map((f) => [`${dir}/${f}`, readFileSync(`${dir}/${f}`, 'utf8')])
			);
			const { entries } = yield* loadData(files, specToml);
			for (const e of entries) {
				expect(yield* writeEntry(e)).toBe(files[`${dir}/${e.slug}.toml`]);
			}
		})
	);
});
