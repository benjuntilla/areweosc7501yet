import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: '../browser',
	outputDir: '../test-results',
	forbidOnly: process.env['CI'] !== undefined,
	// Screenshots render differently on each machine, so only CI compares them. It writes the ones
	// that changed, and the browser job fails if `browser/screenshots/` changed.
	ignoreSnapshots: process.env['CI'] === undefined,
	updateSnapshots: 'changed',
	snapshotPathTemplate: '{testDir}/screenshots/{arg}-{projectName}{ext}',
	webServer: {
		command: 'pnpm preview --port 4799 --strictPort',
		port: 4799
	},
	use: { baseURL: 'http://localhost:4799' },
	projects: [
		{ name: 'desktop', use: devices['Desktop Chrome'] },
		{ name: 'phone', use: devices['Pixel 7'] }
	]
});
