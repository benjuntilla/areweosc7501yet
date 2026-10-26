// Runs lefthook's pre-push jobs in parallel for CI, so lefthook.yml is the one list of checks.
// Each job's output goes in its own GitHub Actions log group; a failed job's log stays expanded.
import { NodeRuntime, NodeServices } from '@effect/platform-node';
import { Console, Effect, Schema, Stream } from 'effect';
import { ChildProcess, ChildProcessSpawner } from 'effect/process';

const Config = Schema.fromJsonString(
	Schema.Struct({
		'pre-push': Schema.Struct({
			jobs: Schema.NonEmptyArray(Schema.Struct({ name: Schema.String }))
		})
	})
);

const run = (job: string) =>
	Effect.scoped(
		Effect.gen(function* () {
			const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
			const handle = yield* spawner.spawn(
				ChildProcess.make('pnpm', [
					'-s',
					'lefthook',
					'run',
					'pre-push',
					'--force',
					'--no-tty',
					'--job',
					job
				])
			);
			const [log, code] = yield* Effect.all(
				[handle.all.pipe(Stream.decodeText, Stream.mkString), handle.exitCode],
				{ concurrency: 2 }
			);
			return { job, log, ok: code === 0 };
		})
	);

const program = Effect.gen(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	const dump = yield* spawner.string(
		ChildProcess.make('pnpm', ['-s', 'lefthook', 'dump', '--format', 'json'])
	);
	const config = yield* Schema.decodeUnknownEffect(Config)(dump);
	const results = yield* Effect.all(
		config['pre-push'].jobs.map(({ name }) => run(name)),
		{ concurrency: 'unbounded' }
	);
	for (const { job, log, ok } of results) {
		yield* ok
			? Console.log(`::group::${job}\n${log.trimEnd()}\n::endgroup::`)
			: Console.log(`::error title=${job}::${job} failed\n${log}`);
	}
	const failed = results.filter((r) => !r.ok).map((r) => r.job);
	if (failed.length > 0) {
		return yield* Effect.fail(new Error(`failed: ${failed.join(', ')}`));
	}
});

NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)));
