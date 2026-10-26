import { getSite } from '#lib/server/site.ts';
import { toAtom } from '#lib/domain/feed.ts';

export const GET = async () =>
	new Response(toAtom(await getSite()), {
		headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' }
	});

export const prerender = true;
