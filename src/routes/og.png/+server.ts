import { getSite } from '#lib/server/site.ts';
import { renderOgImage } from '#lib/server/og/og.ts';

export const GET = async () =>
	new Response(await renderOgImage(await getSite()), {
		headers: { 'content-type': 'image/png' }
	});

export const prerender = true;
