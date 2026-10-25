// Writes the JSON Schemas in schema/ from the Effect Schemas. CI fails if they're stale.
import { NodeRuntime, NodeServices } from '@effect/platform-node';
import { Effect, FileSystem, Schema } from 'effect';
import { Entry } from '../src/lib/domain/schema.ts';
import { DataJson } from '../src/lib/domain/site.ts';

const write = (path: string, schema: Schema.Top) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const doc = Schema.toJsonSchemaDocument(schema, { onExcessProperty: 'error' });
		const json = { $schema: 'https://json-schema.org/draft/2020-12/schema', ...doc.schema };
		yield* fs.writeFileString(path, `${JSON.stringify(json, null, '\t')}\n`);
	});

const program = Effect.gen(function* () {
	yield* FileSystem.FileSystem.pipe(
		Effect.flatMap((fs) => fs.makeDirectory('schema', { recursive: true }))
	);
	yield* write('schema/entry.schema.json', Entry);
	yield* write('schema/data.schema.json', DataJson);
});

NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)));
