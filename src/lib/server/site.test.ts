import { expect, it } from '@effect/vitest';
import { getSite } from './site.ts';

it('decodes every file in data/', async () => {
	const site = await getSite();
	expect(site.entries.length).toBeGreaterThan(0);
	expect(site.verdicts.program.featured).toBeGreaterThan(0);
	expect(site.verdicts.terminal.featured).toBeGreaterThan(0);
});
