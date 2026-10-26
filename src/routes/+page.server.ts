import { overview } from '#lib/domain/overview.ts';
import { getSite } from '#lib/server/site.ts';

export const load = async () => ({ roles: overview(await getSite()) });
