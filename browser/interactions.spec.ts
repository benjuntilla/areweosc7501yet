import { expect, test } from '@playwright/test';

// SvelteKit hydrates the page after the load event, so a test that needs the page's scripts waits
// for the network to go quiet first.

for (const key of ['Meta+K', 'Control+K', '/']) {
	test(`${key} opens search`, async ({ page }) => {
		await page.goto('/methodology', { waitUntil: 'networkidle' });
		await page.keyboard.press(key);
		await expect(page.getByRole('combobox', { name: 'Find a program' })).toBeFocused();
	});
}

test('a deep link unfolds the tail and opens the chip’s popover', async ({ page }) => {
	await page.goto('/#cherry');
	await expect(page.getByRole('button', { name: /^cherry,/u })).toBeInViewport();
	await expect(page.getByRole('dialog', { name: 'cherry' })).toBeVisible();
});

test('a chip’s popover opens on keyboard focus and on hover, and Esc closes it', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'Phones open popovers with a tap.');
	await page.goto('/', { waitUntil: 'networkidle' });
	const chip = page.getByRole('button', { name: /^kitty,/u });
	const popover = page.getByRole('dialog', { name: 'kitty' });
	await chip.focus();
	await expect(popover).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(popover).toBeHidden();
	await chip.hover();
	await expect(popover).toBeVisible();
});

test('a tap opens a chip’s popover, and a second tap closes it', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'Desktop opens popovers on hover.');
	await page.goto('/');
	const chip = page.getByRole('button', { name: /^kitty,/u });
	const popover = page.getByRole('dialog', { name: 'kitty' });
	await chip.tap();
	await expect(popover).toBeVisible();
	await chip.tap();
	await expect(popover).toBeHidden();
});

test('the rail links to each side’s list, from the overview and from another page', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'Phones show meters instead of the rail.');
	await page.goto('/');
	await page.getByRole('link', { name: /^Terminals:/u }).click();
	await expect(page).toHaveURL('/#terminals');
	await expect(page.locator('#terminals')).toBeInViewport();
	await page.goto('/methodology');
	await page.getByRole('link', { name: /^Programs:/u }).click();
	await expect(page).toHaveURL('/#programs');
	await expect(page.locator('#programs')).toBeInViewport();
});

test('a chosen theme applies on the next load before the page’s scripts run', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'The phone menu holds the same toggle.');
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.getByRole('radio', { name: 'Dark' }).click();
	// With the page's scripts blocked, only the inline script in the head can set the theme, and it
	// runs before anything paints.
	await page.route('**/_app/**', (route) => route.abort());
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
