// Rechecks every entry against GitHub, rewrites the files that changed and writes the PR body.
import { ResponseValidation } from '@distilled.cloud/core';
import * as Gh from '@distilled.cloud/github';
import { NodeRuntime, NodeServices } from '@effect/platform-node';
import { Array, DateTime, Effect, FileSystem, Layer, Option } from 'effect';
import { Command, Flag } from 'effect/cli';
import { FetchHttpClient } from 'effect/http';
import { sameRepo } from '../../src/lib/domain/formats.ts';
import { loadData } from '../../src/lib/domain/load.ts';
import { checkEntry, type Checked } from './check.ts';
import { writeEntry } from './toml.ts';

const dir = 'data/entries';
const queries = ['"OSC 7501"', '"Program Status Protocol"'];
// Search also matches issue #7501 and words apart, so a hit must name the protocol itself.
const mentions = /osc[\s-]*7501|program status protocol/iu;
const staleDays = 30;

/** One issue or PR per untracked repo that mentioned the protocol in the past week. */
const candidates = (tracked: ReadonlyArray<string>, since: DateTime.Utc) =>
	Effect.gen(function* () {
		const hits: Array<Gh.search.IssueSearchResultItem> = [];
		for (const q of queries) {
			// Search stops at 1,000 results, ten pages of 100.
			for (let page = 1; page <= 10; page++) {
				const s = yield* Gh.search.issuesAndPullRequests({
					q: `${q} created:>=${DateTime.formatIsoDateUtc(since)}`,
					per_page: 100,
					page
				});
				// GitHub timed out part of the search, so the hits can't be trusted as complete.
				if (s.incomplete_results) {
					return yield* Effect.fail(new Error(`search for ${q} came back incomplete`));
				}
				hits.push(...s.items);
				if (s.items.length < 100) break;
			}
		}
		return Array.dedupeWith(
			hits.filter(
				(h) =>
					h.user?.type !== 'Bot' &&
					mentions.test(`${h.title}\n${h.body ?? ''}`) &&
					!tracked.some((r) => sameRepo(r, repoOf(h)))
			),
			(a, b) => repoOf(a) === repoOf(b)
		);
	});

const repoOf = (h: Gh.search.IssueSearchResultItem) =>
	h.repository_url.replace('https://api.github.com/repos/', '');

// Titles come from strangers: show them as plain text, without pinging people or linking issues here.
const inert = (s: string) =>
	s.replaceAll(/[[\]\\|<>`*_~]/gu, (c) => `\\${c}`).replaceAll(/[@#]/gu, (c) => `${c}\u200B`);

const body = (
	results: ReadonlyArray<Checked>,
	found: Option.Option<ReadonlyArray<Gh.search.IssueSearchResultItem>>,
	stale: ReadonlyArray<{ slug: string; last: string }>
) => {
	const changes = results.flatMap((r) => r.changes);
	const notes = results.flatMap((r) => r.notes);
	return [
		'## History changes',
		changes.length === 0
			? 'None.'
			: [
					'| Entry | From | To | Evidence |',
					'| --- | --- | --- | --- |',
					...changes.map((c) => `| ${c.slug} | ${c.from} | ${c.to} | ${c.source} |`)
				].join('\n'),
		...(notes.length === 0 ? [] : ['## Needs a look', notes.map((n) => `- ${n}`).join('\n')]),
		'## Candidates',
		Option.match(found, {
			onNone: () => "The search failed or came back incomplete. The run's log has the error.",
			onSome: (hits) =>
				hits.length === 0
					? 'None.'
					: hits.map((h) => `- ${repoOf(h)}: [${inert(h.title)}](${h.html_url})`).join('\n')
		}),
		`## Not verified in ${staleDays} days`,
		stale.length === 0
			? 'None.'
			: stale.map((s) => `- ${s.slug}, last checked ${s.last}`).join('\n')
	].join('\n\n');
};

const run = (bodyPath: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const now = yield* DateTime.now;
		const names = (yield* fs.readDirectory(dir)).filter((f) => f.endsWith('.toml')).toSorted();
		const files = Object.fromEntries(
			yield* Effect.forEach(names, (f) =>
				Effect.map(fs.readFileString(`${dir}/${f}`), (t) => [`${dir}/${f}`, t] as const)
			)
		);
		const { entries } = yield* loadData(files, yield* fs.readFileString('data/spec.toml'));

		// Checked against GitHub's schema, so a malformed response becomes that entry's note. Search
		// stays unchecked: its results break the schema with null bodies.
		const results = yield* Effect.forEach(entries, (e) => checkEntry(e, now), {
			concurrency: 4
		}).pipe(Effect.provide(ResponseValidation.additionalProperties));
		const written: Array<string> = [];
		for (const { entry } of results) {
			const path = `${dir}/${entry.slug}.toml`;
			const text = yield* writeEntry(entry);
			if (text !== files[path]) {
				yield* fs.writeFileString(path, text);
				written.push(path);
			}
		}

		const tracked = entries.flatMap((e) => (e.repo === undefined ? [] : [e.repo]));
		const found = yield* candidates(tracked, DateTime.subtract(now, { days: 7 })).pipe(
			Effect.tapError((e) => Effect.logWarning(`candidate search failed: ${e.message}`)),
			Effect.option
		);
		const cutoff = DateTime.subtract(DateTime.removeTime(now), { days: staleDays });
		const stale = results
			.map((r) => r.entry)
			.filter((e) => DateTime.isLessThan(e.last_checked_date, cutoff))
			.map((e) => ({ slug: e.slug, last: DateTime.formatIsoDateUtc(e.last_checked_date) }));
		yield* fs.writeFileString(bodyPath, `${body(results, found, stale)}\n`);
		yield* Effect.log(`rewrote ${written.length} files`);
	});

const checker = Command.make(
	'checker',
	{ body: Flag.String('body').pipe(Flag.withDescription('Where to write the PR body')) },
	({ body: bodyPath }) => run(bodyPath)
);

NodeRuntime.runMain(
	Command.run(checker, { version: '0.0.0' }).pipe(
		Effect.provide(Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer, Gh.CredentialsFromEnv))
	)
);
