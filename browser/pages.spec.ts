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
			await page.emulateMedia({ colorScheme });
			const response = await page.goto(path);
			expect(response?.ok()).toBe(true);
			const { violations } = await new AxeBuilder({ page }).analyze();
			expect(violations).toEqual([]);
			await expect(page).toHaveScreenshot(`${name}-${colorScheme}.png`, { fullPage: true });
		});
	}
}
