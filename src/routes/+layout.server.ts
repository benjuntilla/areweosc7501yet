import { categoryNavNames, roleIds, roleNames, type Side } from '#lib/domain/overview.ts';
import { categoriesByRole, roles } from '#lib/domain/schema.ts';
import { getSite } from '#lib/server/site.ts';
import { Array, DateTime, Option } from 'effect';

export const load = async () => {
	const site = await getSite();
	const updated = Array.reduce(site.entries, DateTime.makeUnsafe(0), (latest, e) =>
		DateTime.max(latest, e.last_checked_date)
	);
	const spec = Array.findFirst(site.spec.revisions, (r) => r.number === site.spec.current);
	return {
		sides: Array.map(roles, (role): Side => {
			const v = site.verdicts[role];
			return {
				role,
				id: roleIds[role],
				name: roleNames[role],
				verdict: v.verdict,
				done: v.done,
				working: v.working,
				featured: v.featured,
				categories: Array.map(categoriesByRole[role], (id) => ({
					id,
					name: categoryNavNames[id]
				}))
			};
		}),
		spec: {
			number: site.spec.current,
			url: Option.getOrUndefined(Option.map(spec, (r) => r.url))
		},
		updated: DateTime.formatUtc(updated, { locale: 'en-US', dateStyle: 'medium' })
	};
};
