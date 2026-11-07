import { changeWeeks } from '#lib/domain/changes.ts';
import { getSite } from '#lib/server/site.ts';

export const load = async () => ({ weeks: changeWeeks(await getSite()) });
