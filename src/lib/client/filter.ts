import { Array, String as Str } from 'effect';
import type { CategoryView, Chip } from '#lib/domain/overview.ts';

const chipsOf = (c: CategoryView) => c.featured.concat(c.more);

export const matches = (chip: Chip, query: string) => {
	const q = Str.toLowerCase(Str.trim(query));
	return q === '' || chip.terms.includes(q);
};

export const countMatches = (categories: ReadonlyArray<CategoryView>, query: string) =>
	Array.countBy(Array.flatMap(categories, chipsOf), (c) => matches(c, query));

export const categoryOf = (categories: ReadonlyArray<CategoryView>, slug: string) =>
	categories.find((c) => chipsOf(c).some((chip) => chip.slug === slug));
