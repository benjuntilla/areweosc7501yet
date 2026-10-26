import { expect, it } from '@effect/vitest';
import { getSite } from '../site.ts';
import { renderOgImage } from './og.ts';

it('renders a 1200×630 png', async () => {
	const png = Buffer.from(await renderOgImage(await getSite()));
	expect(png.subarray(1, 4).toString()).toBe('PNG');
	expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
}, 30_000);
