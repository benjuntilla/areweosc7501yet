import { getSite } from '#lib/server/site.ts';
import { toDataJson } from '#lib/domain/site.ts';
import { DateTime } from 'effect';

export const GET = async () => Response.json(toDataJson(await getSite(), DateTime.nowUnsafe()));

export const prerender = true;
