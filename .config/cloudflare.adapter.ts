// adapter-static, then cf's Build Output (.cloudflare/output/v0) from build/.
// cf 1.0.0-beta.21 detects SvelteKit and runs its build, but nothing writes the
// Build Output it reads afterwards. Remove this once cf supports SvelteKit.
import type { Adapter } from '@sveltejs/kit';
import staticAdapter from '@sveltejs/adapter-static';
import {
	cleanBuildOutputDir,
	writeAssets,
	writeRootConfig,
	writeWorkerConfig
} from '@cloudflare/build-output-utils';
import { loadAndParseConfig } from '@cloudflare/config';
import { Config, Effect } from 'effect';

// cf sets this for preview builds.
const isPreview = Config.Boolean('CLOUDFLARE_PREVIEW_BUILD').pipe(Config.withDefault(false));

const writeBuildOutput = async (root: string) => {
	// cf only passes --mode to frameworks that support it, so mode stays unset.
	const ctx = { isPreview: await Effect.runPromise(isPreview), mode: undefined };
	const { result } = await loadAndParseConfig('cloudflare.config.ts', ctx);
	if (!result.success) throw result.error;
	const { worker, containers: _containers, ...settings } = result.data;
	if (worker === undefined) throw new Error('cloudflare.config.ts has no worker');
	await cleanBuildOutputDir(root);
	await writeAssets({ root, sourceDirectory: 'build' });
	await writeWorkerConfig({ root, config: worker });
	await writeRootConfig(root, settings, ctx);
};

export default (): Adapter => {
	const inner = staticAdapter();
	return {
		...inner,
		name: 'adapter-static + cf build output',
		async adapt(builder) {
			await inner.adapt(builder);
			await writeBuildOutput(process.cwd());
			builder.log.minor('Wrote cf Build Output to .cloudflare/output');
		}
	};
};
