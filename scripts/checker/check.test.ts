import { readdirSync, readFileSync } from 'node:fs';
import * as Gh from '@distilled.cloud/github';
import { describe, expect, it } from '@effect/vitest';
import { DateTime, Effect, Layer, Redacted, Schema } from 'effect';
import { HttpClient, HttpClientResponse } from 'effect/http';
import { loadData, type SlugEntry } from '../../src/lib/domain/load.ts';
import { Entry } from '../../src/lib/domain/schema.ts';
import { checkerToml, specToml } from '../../src/lib/domain/fixtures.ts';
import { checkEntry } from './check.ts';
import { writeEntry } from './toml.ts';

// GitHub responses recorded on Oct 26, 2026, trimmed to what the checker reads and keyed by path
// and query.

const release = (repo: string, tag: string, at: string, prerelease = false) => ({
	tag_name: tag,
	html_url: `https://github.com/${repo}/releases/tag/${tag}`,
	draft: false,
	prerelease,
	published_at: at
});

const pebrel = {
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

const kitty = {
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

const tmux = (state: 'open' | 'closed', reason: string | null) => ({
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

const termy = {
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

// crossterm left GitHub's Latest on 0.28 after it released 0.29.
const crossterm = (status: 'ahead' | 'diverged') => ({
	'/repos/crossterm-rs/crossterm': { stargazers_count: 3800 },
	'/repos/crossterm-rs/crossterm/releases?per_page=30': [
		release('crossterm-rs/crossterm', '0.29', '2025-04-05T15:21:04Z'),
		release('crossterm-rs/crossterm', '0.28', '2024-07-31T17:41:00Z')
	],
	'/repos/crossterm-rs/crossterm/releases/latest': release(
		'crossterm-rs/crossterm',
		'0.28',
		'2024-07-31T17:41:00Z'
	),
	'/repos/crossterm-rs/crossterm/compare/0.28...0.29?per_page=1': { status }
});

// A letter after the version: tmux's 3.6a is a full release, and a Python-style 3.7a1 is a
// pre-release, here without GitHub's flag.
const letterTags = {
	'/repos/tmux/tmux': { stargazers_count: 41000 },
	'/repos/tmux/tmux/releases?per_page=30': [
		release('tmux/tmux', '3.7a1', '2026-10-25T00:00:00Z'),
		release('tmux/tmux', '3.6a', '2026-10-20T00:00:00Z'),
		release('tmux/tmux', '3.6', '2026-10-10T00:00:00Z')
	],
	'/repos/tmux/tmux/releases/latest': release('tmux/tmux', '3.6', '2026-10-10T00:00:00Z'),
	'/repos/tmux/tmux/compare/3.6...3.6a?per_page=1': { status: 'ahead' }
};

const kimi = {
	'/repos/MoonshotAI/kimi-code': { stargazers_count: 9000 },
	'/repos/MoonshotAI/kimi-code/releases?per_page=30': [
		release('MoonshotAI/kimi-code', 'desktop-v0.4.0', '2026-10-25T00:00:00Z'),
		release('MoonshotAI/kimi-code', '@moonshot-ai/kimi-code@2.3.2', '2026-10-24T00:00:00Z')
	]
};

const fakeGitHub = (recorded: Record<string, unknown>) =>
	Layer.mergeAll(
		Gh.credentials({ token: Redacted.make('test') }),
		Layer.succeed(
			HttpClient.HttpClient,
			HttpClient.make((req, url) =>
				Effect.succeed(
					HttpClientResponse.fromWeb(
						req,
						`${url.pathname}${url.search}` in recorded
							? Response.json(recorded[`${url.pathname}${url.search}`])
							: new Response('{"message":"Not Found"}', { status: 404 })
					)
				)
			)
		)
	);

const now = DateTime.makeUnsafe('2026-10-26T14:00:00Z');
const lastRun = DateTime.makeUnsafe('2026-10-19');

const entry = (fields: { repo: string; history?: ReadonlyArray<object>; github?: object }) =>
	Schema.decodeUnknownEffect(Entry)({
		name: 'X',
		url: 'https://example.com',
		role: 'terminal',
		category: 'emulators',
		spec_revision: '0.4',
		last_checked_date: '2026-10-24',
		history: [],
		...fields
	}).pipe(Effect.map((e) => ({ slug: 'x', ...e })));

const block = (state: string, source: string, date = '2026-10-12') => ({ date, state, source });

const run = (e: SlugEntry, recorded: Record<string, unknown>) =>
	checkEntry(e, now, lastRun).pipe(Effect.provide(fakeGitHub(recorded)));

const idleTmuxClosedAs = (reason: string) =>
	entry({
		repo: 'tmux/tmux',
		history: [block('idle', 'https://github.com/tmux/tmux/issues/5713')]
	}).pipe(Effect.flatMap((e) => run(e, tmux('closed', reason))));

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
			const e = yield* entry({
				repo: 'Kuddev/pebrel',
				history: [block('working', 'https://github.com/Kuddev/pebrel/pull/691', '2026-10-21')]
			});
			const r = yield* run(e, pebrel);
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
				popular: true,
				latest_release_tag: 'v2.3.0',
				latest_release_date: DateTime.makeUnsafe('2026-10-26')
			});
			expect(r.entry.last_checked_date).toBeUndefined();
		})
	);

	it.effect('follows a blocked PR that was later merged', () =>
		Effect.gen(function* () {
			const e = yield* entry({
				repo: 'Kuddev/pebrel',
				history: [block('blocked', 'https://github.com/Kuddev/pebrel/pull/691', '2026-10-15')]
			});
			const r = yield* run(e, pebrel);
			expect(r.changes.map((c) => `${c.from}>${c.to}`)).toEqual([
				'blocked>working',
				'working>done'
			]);
		})
	);

	it.effect('marks a PR closed without merging as blocked', () =>
		Effect.gen(function* () {
			const e = yield* entry({
				repo: 'kovidgoyal/kitty',
				history: [block('working', 'https://github.com/kovidgoyal/kitty/pull/10657')]
			});
			const r = yield* run(e, kitty);
			expect(tail(r.entry)).toMatchObject({ state: 'blocked', date: '2026-10-13T03:58:18.000Z' });
		})
	);

	it.effect('marks a request closed as not planned as error, dated from the close', () =>
		Effect.gen(function* () {
			const r = yield* idleTmuxClosedAs('not_planned');
			expect(tail(r.entry)).toMatchObject({ state: 'error', date: '2026-10-13T07:50:10.000Z' });
		})
	);

	it.effect('leaves a request closed as completed for a person', () =>
		Effect.gen(function* () {
			const r = yield* idleTmuxClosedAs('completed');
			expect(r.entry.history).toHaveLength(1);
			expect(r.notes).toEqual(['https://github.com/tmux/tmux/issues/5713 was closed as completed']);
		})
	);

	it.effect('turns a reopened declined request back to idle', () =>
		Effect.gen(function* () {
			const e = yield* entry({
				repo: 'tmux/tmux',
				history: [
					block(
						'error',
						'https://github.com/tmux/tmux/issues/5713#issuecomment-6079182674',
						'2026-10-13'
					)
				]
			});
			const r = yield* run(e, tmux('open', 'reopened'));
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
			const r = yield* run(yield* entry({ repo: 'lassejlv/termy' }), termy);
			expect(r.entry.github?.latest_release_tag).toBe('v1.0.0-rc.8');
		})
	);

	it.effect('takes a later release that contains Latest', () =>
		Effect.gen(function* () {
			const r = yield* run(yield* entry({ repo: 'crossterm-rs/crossterm' }), crossterm('ahead'));
			expect(r.entry.github?.latest_release_tag).toBe('0.29');
		})
	);

	it.effect("keeps Latest over a later release that doesn't contain it, like a backport", () =>
		Effect.gen(function* () {
			const r = yield* run(yield* entry({ repo: 'crossterm-rs/crossterm' }), crossterm('diverged'));
			expect(r.entry.github?.latest_release_tag).toBe('0.28');
		})
	);

	it.effect("skips a pre-release tag GitHub doesn't flag, but keeps 3.6a", () =>
		Effect.gen(function* () {
			const r = yield* run(yield* entry({ repo: 'tmux/tmux' }), letterTags);
			expect(r.entry.github?.latest_release_tag).toBe('3.6a');
		})
	);

	it.effect('keeps a monorepo entry on its own release line', () =>
		Effect.gen(function* () {
			const e = yield* entry({
				repo: 'MoonshotAI/kimi-code',
				github: { popular: false, latest_release_tag: '@moonshot-ai/kimi-code@2.3.1' }
			});
			const r = yield* run(e, kimi);
			expect(r.entry.github?.latest_release_tag).toBe('@moonshot-ai/kimi-code@2.3.2');
		})
	);

	it.effect('reports a failed check instead of failing the run', () =>
		Effect.gen(function* () {
			const e = yield* entry({ repo: 'gone/away' });
			const r = yield* run(e, {});
			expect(r.notes[0]).toMatch(/^Couldn't check x: /u);
			expect(r.entry).toEqual(e);
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
			const { entries } = yield* loadData(files, specToml, checkerToml);
			for (const e of entries) {
				expect(yield* writeEntry(e)).toBe(files[`${dir}/${e.slug}.toml`]);
			}
		})
	);

	it.effect('writes a note that TOML has to escape so it reads back the same', () =>
		Effect.gen(function* () {
			const note = 'say "hi" \\ a\u007Fb\nnext line';
			const text = yield* writeEntry({ ...(yield* entry({ repo: 'a/b' })), note });
			const again = yield* loadData({ '/data/entries/x.toml': text }, specToml, checkerToml);
			expect(again.entries[0]!.note).toBe(note);
		})
	);
});
