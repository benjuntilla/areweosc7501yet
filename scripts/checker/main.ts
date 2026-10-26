// Rechecks every entry against GitHub, rewrites the files that changed and writes the PR body.
import { NodeRuntime, NodeServices } from '@effect/platform-node';
import { Array, Config, DateTime, Effect, FileSystem, Layer, Option } from 'effect';
import { Command, Flag } from 'effect/cli';
import { FetchHttpClient } from 'effect/http';
import { ChildProcess, ChildProcessSpawner } from 'effect/process';
import { sameRepo } from '../../src/lib/domain/formats.ts';
import { loadData } from '../../src/lib/domain/load.ts';
import { checkEntry, type Checked } from './check.ts';
import { GitHub, layer, type SearchHit } from './github.ts';
import { writeEntry } from './toml.ts';

const dir = 'data/entries';
const queries = ['"OSC 7501"', '"Program Status Protocol"'];
// Search also matches issue #7501 and words apart, so a hit must name the protocol itself.
const mentions = /osc[\s-]*7501|program status protocol/iu;
const staleDays = 30;

const day = (d: DateTime.Utc) => DateTime.formatIsoDateUtc(d);

/** One issue or PR per untracked repo that mentioned the protocol in the past week. */
const candidates = (tracked: ReadonlyArray<string>, since: DateTime.Utc) =>
	Effect.gen(function* () {
		const gh = yield* GitHub;
		const hits = yield* Effect.forEach(queries, (q) => gh.search(`${q} created:>=${day(since)}`));
		return Array.dedupeWith(
			hits
				.flat()
				.filter(
					(h) =>
						h.user.type !== 'Bot' &&
						mentions.test(`${h.title}\n${h.body ?? ''}`) &&
						!tracked.some((r) => sameRepo(r, repoOf(h)))
				),
			(a, b) => repoOf(a) === repoOf(b)
		);
	});

const repoOf = (h: SearchHit) => h.repository_url.replace('https://api.github.com/repos/', '');

// Titles come from strangers: keep them from closing the link, pinging people or linking issues here.
const inert = (s: string) =>
	s.replaceAll(/[[\]\\|]/gu, (c) => `\\${c}`).replaceAll(/[@#]/gu, (c) => `${c}\u200B`);

const body = (
	results: ReadonlyArray<Checked>,
	found: Option.Option<ReadonlyArray<SearchHit>>,
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

		const results = yield* Effect.forEach(entries, (e) => checkEntry(e, now), { concurrency: 4 });
		const written = yield* Effect.filter(results, ({ entry }) =>
			Effect.gen(function* () {
				const path = `${dir}/${entry.slug}.toml`;
				const text = yield* writeEntry(entry);
				if (text === files[path]) return false;
				yield* fs.writeFileString(path, text);
				return true;
			})
		).pipe(Effect.map((rs) => rs.map(({ entry }) => `${dir}/${entry.slug}.toml`)));
		if (written.length > 0) {
			const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
			yield* spawner.string(ChildProcess.make('pnpm', ['-s', 'oxfmt', ...written]));
		}

		const tracked = entries.flatMap((e) => (e.repo === undefined ? [] : [e.repo]));
		const found = yield* candidates(tracked, DateTime.subtract(now, { days: 7 })).pipe(
			Effect.map(Option.some),
			Effect.catch((e) =>
				Effect.as(Effect.logWarning(`candidate search failed: ${e.message}`), Option.none())
			)
		);
		const cutoff = DateTime.subtract(DateTime.removeTime(now), { days: staleDays });
		const stale = results
			.map((r) => r.entry)
			.filter((e) => DateTime.isLessThan(e.last_checked_date, cutoff))
			.map((e) => ({ slug: e.slug, last: day(e.last_checked_date) }));
		yield* fs.writeFileString(bodyPath, `${body(results, found, stale)}\n`);
		yield* Effect.log(`rewrote ${written.length} files`);
	});

const checker = Command.make(
	'checker',
	{ body: Flag.String('body').pipe(Flag.withDescription('Where to write the PR body')) },
	({ body: bodyPath }) =>
		Effect.gen(function* () {
			const token = yield* Config.Redacted('GITHUB_TOKEN');
			yield* run(bodyPath).pipe(Effect.provide(layer(token)));
		})
);

NodeRuntime.runMain(
	Command.run(checker, { version: '0.0.0' }).pipe(
		Effect.provide(Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer))
	)
);
