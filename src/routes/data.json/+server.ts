import { json } from '@sveltejs/kit';
import { getSite } from '#lib/server/site.ts';
import { toDataJson } from '#lib/domain/site.ts';

export const GET = async () => json(toDataJson(await getSite(), new Date()));

export const prerender = true;
