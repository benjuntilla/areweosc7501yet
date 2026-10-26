import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from '@effect/vitest';
import { DateTime, Effect, Layer, Redacted } from 'effect';
import { HttpClient, HttpClientResponse } from 'effect/http';
import { loadData } from '../../src/lib/domain/load.ts';
import { Entry } from '../../src/lib/domain/schema.ts';
import { specToml } from '../../src/lib/domain/fixtures.ts';
import { checkEntry } from './check.ts';
import { GitHub, make } from './github.ts';
import { writeEntry } from './toml.ts';

// Trimmed GitHub responses, recorded on Oct 26, 2026, keyed by path and query.
type Recorded = Readonly<Record<string, unknown>>;

const release = (repo: string, tag: string, at: string, prerelease = false) => ({
	tag_name: tag,
	html_url: `https://github.com/${repo}/releases/tag/${tag}`,
	draft: false,
	prerelease,
	published_at: at
});

const pebrel: Recorded = {
	'/repos/Kuddev/pebrel': { stargazers_count: 3602 },
	'/repos/Kuddev/pebrel/releases?per_page=30': [
		release('Kuddev/pebrel', 'v2.3.0', '2026-10-26T05:14:08Z'),
		release('Kuddev/pebrel', 'v2.2.2', '2026-10-17T09:09:24Z')
	],
	'/repos/Kuddev/pebrel/releases/latest': release(
		'Kuddev/pebrel',
		'v2.3.0',
		'2026-10-26T05:14:08Z'
	),
	'/repos/Kuddev/pebrel/pulls/691': {
		state: 'closed',
		merged_at: '2026-10-21T05:55:09Z',
		merge_commit_sha: 'c57f4c9e12d30645117ac90c9df46cc71379a120',
		closed_at: '2026-10-21T05:55:09Z'
	},
	'/repos/Kuddev/pebrel/compare/c57f4c9e12d30645117ac90c9df46cc71379a120...v2.3.0?per_page=1': {
		status: 'ahead'
	}
};

const kitty: Recorded = {
	'/repos/kovidgoyal/kitty': { stargazers_count: 35419 },
	'/repos/kovidgoyal/kitty/releases?per_page=30': [
		release('kovidgoyal/kitty', 'v0.49.2', '2026-10-01T04:00:00Z')
	],
	'/repos/kovidgoyal/kitty/pulls/10657': {
		state: 'closed',
		merged_at: null,
		merge_commit_sha: null,
		closed_at: '2026-10-13T03:58:18Z'
	}
};

const tmux = (state: 'open' | 'closed', reason: string | null): Recorded => ({
	'/repos/tmux/tmux': { stargazers_count: 41000 },
	'/repos/tmux/tmux/releases?per_page=30': [],
	'/repos/tmux/tmux/issues/5713': {
		state,
		state_reason: reason,
		closed_at: state === 'closed' ? '2026-10-13T07:50:10Z' : null
	},
	'/repos/tmux/tmux/issues/5713/events?per_page=100': [
		{ event: 'closed', created_at: '2026-10-13T07:50:10Z' },
		{ event: 'reopened', created_at: '2026-10-20T09:00:00Z' }
	]
});

const termy: Recorded = {
	'/repos/lassejlv/termy': { stargazers_count: 452 },
	'/repos/lassejlv/termy/releases?per_page=30': [
		release('lassejlv/termy', 'v1.0.0-rc.9', '2026-10-25T08:00:00Z', true),
		release('lassejlv/termy', 'v1.0.0-rc.8', '2026-10-23T08:37:58Z')
	],
	'/repos/lassejlv/termy/releases/latest': release(
		'lassejlv/termy',
		'v1.0.0-rc.8',
		'2026-10-23T08:37:58Z'
	)
};

const kimi: Recorded = {
	'/repos/MoonshotAI/kimi-code': { stargazers_count: 9000 },
	'/repos/MoonshotAI/kimi-code/releases?per_page=30': [
		release('MoonshotAI/kimi-code', 'desktop-v0.4.0', '2026-10-25T00:00:00Z'),
		release('MoonshotAI/kimi-code', '@moonshot-ai/kimi-code@2.3.2', '2026-10-24T00:00:00Z')
	]
};

const fakeGitHub = (recorded: Recorded) =>
	Layer.succeed(
		GitHub,
		make(
			HttpClient.make((req, url) =>
				Effect.succeed(
					HttpClientResponse.fromWeb(
						req,
						`${url.pathname}${url.search}` in recorded
							? Response.json(recorded[`${url.pathname}${url.search}`])
							: new Response('{"message":"Not Found"}', { status: 404 })
					)
				)
			),
			Redacted.make('test')
		)
	);

const now = DateTime.makeUnsafe('2026-10-26T14:00:00Z');

const entry = (toml: string) =>
	loadData({ '/data/entries/x.toml': toml }, specToml).pipe(
		Effect.map(({ entries }) => entries[0]!)
	);

const toml = (repo: string, history: string, github = '') => `
name = "X"
url = "https://example.com"
repo = "${repo}"
role = "terminal"
category = "emulators"
spec_revision = "0.4"
last_checked_date = 2026-10-24
${history === '' ? 'history = []' : ''}
${github}
${history}
`;

const block = (state: string, source: string, date = '2026-10-12') =>
	`[[history]]\ndate = ${date}\nstate = "${state}"\nsource = "${source}"\n`;

const run = (text: string, recorded: Recorded) =>
	entry(text).pipe(
		Effect.flatMap((e) => checkEntry(e, now)),
		Effect.provide(fakeGitHub(recorded))
	);

const tail = (e: Entry) =>
	e.history.slice(-1).map((h) => ({
		date: DateTime.formatIso(h.date),
		state: h.state,
		source: h.source,
		version: h.version
	}))[0];

describe('checkEntry', () => {
	it.effect('follows a merged PR to the stable release that contains it', () =>
		Effect.gen(function* () {
			const r = yield* run(
				toml(
					'Kuddev/pebrel',
					block('working', 'https://github.com/Kuddev/pebrel/pull/691', '2026-10-21')
				),
				pebrel
			);
			expect(r.changes.map((c) => `${c.from}>${c.to}`)).toEqual([
				'working>working',
				'working>done'
			]);
			expect(r.entry.history[1]!.source).toBe(
				'https://github.com/Kuddev/pebrel/commit/c57f4c9e12d30645117ac90c9df46cc71379a120'
			);
			expect(tail(r.entry)).toEqual({
				date: '2026-10-26T05:14:08.000Z',
				state: 'done',
				source: 'https://github.com/Kuddev/pebrel/releases/tag/v2.3.0',
				version: 'v2.3.0'
			});
			expect(r.entry.github).toEqual({
				stars: 3602,
				latest_release_tag: 'v2.3.0',
				latest_release_date: DateTime.makeUnsafe('2026-10-26')
			});
			expect(DateTime.formatIsoDateUtc(r.entry.last_checked_date)).toBe('2026-10-26');
		})
	);

	it.effect('follows a blocked PR that was reopened and merged', () =>
		Effect.gen(function* () {
			const r = yield* run(
				toml(
					'Kuddev/pebrel',
					block('blocked', 'https://github.com/Kuddev/pebrel/pull/691', '2026-10-15')
				),
				pebrel
			);
			expect(r.changes.map((c) => `${c.from}>${c.to}`)).toEqual([
				'blocked>working',
				'working>done'
			]);
		})
	);

	it.effect('marks a PR closed without merging as blocked', () =>
		Effect.gen(function* () {
			const r = yield* run(
				toml(
					'kovidgoyal/kitty',
					block('working', 'https://github.com/kovidgoyal/kitty/pull/10657')
				),
				kitty
			);
			expect(tail(r.entry)).toMatchObject({ state: 'blocked', date: '2026-10-13T03:58:18.000Z' });
		})
	);

	it.effect('marks a request closed as not planned as error, dated from the close', () =>
		Effect.gen(function* () {
			const r = yield* run(
				toml('tmux/tmux', block('idle', 'https://github.com/tmux/tmux/issues/5713')),
				tmux('closed', 'not_planned')
			);
			expect(tail(r.entry)).toMatchObject({ state: 'error', date: '2026-10-13T07:50:10.000Z' });
		})
	);

	it.effect('leaves a request closed as completed for a person', () =>
		Effect.gen(function* () {
			const r = yield* run(
				toml('tmux/tmux', block('idle', 'https://github.com/tmux/tmux/issues/5713')),
				tmux('closed', 'completed')
			);
			expect(r.entry.history).toHaveLength(1);
			expect(r.notes).toEqual(['https://github.com/tmux/tmux/issues/5713 was closed as completed']);
		})
	);

	it.effect('turns a reopened declined request back to idle', () =>
		Effect.gen(function* () {
			const r = yield* run(
				toml(
					'tmux/tmux',
					block(
						'error',
						'https://github.com/tmux/tmux/issues/5713#issuecomment-6079182674',
						'2026-10-13'
					)
				),
				tmux('open', 'reopened')
			);
			expect(tail(r.entry)).toEqual({
				date: '2026-10-20T09:00:00.000Z',
				state: 'idle',
				source: 'https://github.com/tmux/tmux/issues/5713',
				version: undefined
			});
		})
	);

	it.effect('counts the Latest rc as stable and skips pre-releases', () =>
		Effect.gen(function* () {
			const r = yield* run(toml('lassejlv/termy', ''), termy);
			expect(r.entry.github?.latest_release_tag).toBe('v1.0.0-rc.8');
		})
	);

	it.effect('keeps a monorepo entry on its own release line', () =>
		Effect.gen(function* () {
			const github = '[github]\nstars = 1\nlatest_release_tag = "@moonshot-ai/kimi-code@2.3.1"\n';
			const r = yield* run(toml('MoonshotAI/kimi-code', '', github), kimi);
			expect(r.entry.github?.latest_release_tag).toBe('@moonshot-ai/kimi-code@2.3.2');
		})
	);

	it.effect('reports a failed check instead of failing the run', () =>
		Effect.gen(function* () {
			const text = toml('gone/away', '');
			const r = yield* run(text, {});
			expect(r.notes[0]).toMatch(/^Couldn't check x: /u);
			expect(r.entry).toEqual(yield* entry(text));
		})
	);
});

describe('writeEntry', () => {
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

	it.effect('escapes DEL, which TOML bans raw', () =>
		Effect.gen(function* () {
			const e = yield* entry(toml('a/b', ''));
			const text = yield* writeEntry({ ...e, note: 'a\u007Fb' });
			const again = yield* loadData({ '/data/entries/x.toml': text }, specToml);
			expect(again.entries[0]!.note).toBe('a\u007Fb');
		})
	);
});
