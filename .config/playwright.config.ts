import { defineConfig, devices } from '@playwright/test';
import playwright from '@playwright/test/package.json' with { type: 'json' };

// Screenshots match only when the browser runs in Playwright's Docker image, as it does in CI.
// `pnpm screenshots` sets PLAYWRIGHT_DOCKER to start the image here and run the browser in it.
const docker = process.env['PLAYWRIGHT_DOCKER'] !== undefined;

// Screenshots mode builds the pages from browser/screenshot-data, a fixed copy of some entries.
const preview = {
	command: 'pnpm build --mode screenshots && pnpm preview --port 4799 --strictPort',
	port: 4799
};

export default defineConfig({
	testDir: '../browser',
	outputDir: '../test-results',
	forbidOnly: process.env['CI'] !== undefined,
	// Other runs skip screenshots. CI writes the ones that changed, and the browser job fails if
	// `browser/screenshots/` changed.
	ignoreSnapshots: process.env['CI'] === undefined && !docker,
	updateSnapshots: 'changed',
	snapshotPathTemplate: '{testDir}/screenshots/{arg}-{projectName}{ext}',
	webServer: docker
		? [
				preview,
				{
					command: [
						'docker run --rm --init --platform linux/amd64 --publish 127.0.0.1:4800:4800',
						'--volume ../node_modules:/node_modules:ro',
						`mcr.microsoft.com/playwright:v${playwright.version}-noble`,
						'node /node_modules/@playwright/test/cli.js run-server --port 4800 --host 0.0.0.0'
					].join(' '),
					url: 'http://localhost:4800',
					// The first run downloads the image, about 1 GB.
					timeout: 300_000,
					// After it launches a browser, Playwright's server exits on SIGINT but not on SIGTERM.
					gracefulShutdown: { signal: 'SIGINT', timeout: 10_000 }
				}
			]
		: preview,
	use: {
		baseURL: 'http://localhost:4799',
		// The browser in the container reaches the preview server through the connection.
		connectOptions: docker
			? { wsEndpoint: 'ws://localhost:4800', exposeNetwork: '<loopback>' }
			: undefined
	},
	projects: [
		{ name: 'desktop', use: devices['Desktop Chrome'] },
		{ name: 'phone', use: devices['Pixel 7'] }
	]
});
