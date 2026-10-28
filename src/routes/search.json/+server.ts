import { categoryNames } from '#lib/domain/overview.ts';
import { SearchRecords } from '#lib/domain/search.ts';
import { getSite } from '#lib/server/site.ts';
import { Array, Schema } from 'effect';

export const GET = async () => {
	const site = await getSite();
	return Response.json(
		Schema.encodeSync(SearchRecords)(
			Array.map(site.entries, (e) => ({
				slug: e.slug,
				name: e.name,
				aliases: e.aliases ?? [],
				repo: e.repo ?? '',
				category: categoryNames[e.category],
				state: e.state
			}))
		)
	);
};

export const prerender = true;
