import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'browser',
	forbidOnly: process.env['CI'] !== undefined,
	// Screenshots render differently on each OS, so only Linux, which CI runs, compares them.
	ignoreSnapshots: process.platform !== 'linux',
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
