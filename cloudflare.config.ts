import { defineConfig, defineWorker } from 'cf/config';

export default defineConfig({
	worker: defineWorker({
		name: 'areweosc7501yet',
		compatibilityDate: '2026-10-24',
		assets: { notFoundHandling: '404-page', htmlHandling: 'drop-trailing-slash' },
		domains: ['areweosc7501yet.com']
	})
});
