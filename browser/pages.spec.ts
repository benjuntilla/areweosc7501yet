import { globSync } from 'node:fs';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = globSync('**/*.html', { cwd: 'build' }).map((file) => {
	const name = file.replace(/\.html$/u, '');
	return { name, path: name === 'index' ? '/' : `/${name}` };
});

for (const { name, path } of pages) {
	for (const colorScheme of ['light', 'dark'] as const) {
		test(`${name} in ${colorScheme}`, async ({ page }) => {
			// Reduced motion stops the logo and the drum from turning, so the screenshots are stable.
			await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
			const response = await page.goto(path);
			expect(response?.ok()).toBe(true);
			// The drum's faded rows are decoration, which WCAG exempts from contrast, so only the contrast
			// rule skips the drum. This test checks contrast everywhere else, so Lighthouse skips its own
			// contrast audit.
			const contrast = await new AxeBuilder({ page })
				.withRules('color-contrast')
				.exclude('.drum')
				.analyze();
			const rest = await new AxeBuilder({ page }).disableRules('color-contrast').analyze();
			expect([...contrast.violations, ...rest.violations]).toEqual([]);
			await expect(page).toHaveScreenshot(`${name}-${colorScheme}.png`, { fullPage: true });
		});
	}
}
