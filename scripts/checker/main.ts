// Rechecks every entry against GitHub, rewrites the files that changed and writes the PR body.
import { ResponseValidation } from '@distilled.cloud/core';
import * as Gh from '@distilled.cloud/github';
import { NodeRuntime, NodeServices } from '@effect/platform-node';
import { Config, DateTime, Effect, FileSystem, Layer } from 'effect';
import { Command, Flag } from 'effect/cli';
import { FetchHttpClient } from 'effect/http';
import { loadData } from '../../src/lib/domain/load.ts';
import { checkEntry } from './check.ts';
import { body, candidates, staleDays } from './report.ts';
import { writeEntry } from './toml.ts';

const dir = 'data/entries';

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

		// This repo's own PRs mention the protocol too.
		const self = yield* Config.String('GITHUB_REPOSITORY');
		const tracked = entries.flatMap((e) => (e.repo === undefined ? [] : [e.repo]));
		const found = yield* candidates([self, ...tracked], DateTime.subtract(now, { days: 7 })).pipe(
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
