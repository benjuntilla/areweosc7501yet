import { defineConfig, defineWorker } from 'cf/config';
import { siteUrl } from './src/lib/meta.ts';

export default defineConfig({
	worker: defineWorker({
		name: 'areweosc7501yet',
		compatibilityDate: '2026-10-24',
		assets: { notFoundHandling: '404-page', htmlHandling: 'drop-trailing-slash' },
		domains: [siteUrl.host],
		previewUrls: true,
		observability: { enabled: true, traces: { enabled: true }, issues: { enabled: true } }
	})
});
