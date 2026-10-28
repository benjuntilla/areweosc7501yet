import { Array, Option, Order, String as Str } from 'effect';
import { formatDay } from './derive.ts';
import { githubRepoOf } from './formats.ts';
import { categoriesByRole, type Category, type Role, roles, states, type State } from './schema.ts';
import type { Site } from './site.ts';

export const roleNames: Record<Role, string> = { program: 'Programs', terminal: 'Terminals' };
export const roleIds: Record<Role, string> = { program: 'programs', terminal: 'terminals' };

export const categoryNames: Record<Category, string> = {
	'coding-agents': 'Coding agents',
	clis: 'CLIs & build tools',
	libraries: 'Libraries',
	emulators: 'Terminal emulators',
	multiplexers: 'Multiplexers & agent inboxes',
	engines: 'Engines'
};

/** The nav has less room, so one category name is shorter there. */
export const categoryNavNames: Record<Category, string> = {
	...categoryNames,
	multiplexers: 'Multiplexers & inboxes'
};

/** A short name for a source link: owner/name@sha, owner/name#123, owner/name v1.2 or the bare URL. */
export const sourceLabel = (url: string): string =>
	Option.match(githubRepoOf(url), {
		onNone: () => Str.replace(/^https:\/\/(www\.)?/u, '')(url),
		onSome: (repo) => {
			const pr = /\/(?:pull|issues)\/(\d+)/u.exec(url);
			if (pr) return `${repo}#${pr[1] ?? ''}`;
			const sha = /\/commit\/([0-9a-f]{7})/u.exec(url);
			if (sha) return `${repo}@${sha[1] ?? ''}`;
			const tag = /\/releases\/tag\/([^/?#]+)/u.exec(url);
			if (tag) return `${repo} ${tag[1] ?? ''}`;
			return Str.replace(/^https:\/\/github\.com\//u, '')(url);
		}
	});

export interface Chip {
	readonly slug: string;
	readonly name: string;
	readonly url: string;
	readonly state: State;
	readonly sentence: string;
	readonly note: string | undefined;
	readonly source: string | undefined;
	readonly sourceLabel: string | undefined;
	readonly specRevision: string;
	readonly checked: string;
}

export interface CategoryView {
	readonly id: Category;
	readonly name: string;
	readonly featured: ReadonlyArray<Chip>;
	readonly more: ReadonlyArray<Chip>;
}

export interface RoleView {
	readonly role: Role;
	readonly id: string;
	readonly name: string;
	readonly categories: ReadonlyArray<CategoryView>;
}

type SiteEntry = Site['entries'][number];

const chipOrder = Order.combine(
	Order.mapInput(Order.Number, (c: Chip) => states.indexOf(c.state)),
	Order.mapInput(Order.String, (c: Chip) => c.name.toLowerCase())
);

const toChip = (e: SiteEntry): Chip => {
	const source = Option.getOrUndefined(Option.map(Array.last(e.history), (b) => b.source));
	return {
		slug: e.slug,
		name: e.name,
		url: e.url,
		state: e.state,
		sentence: e.sentence,
		note: e.note,
		source,
		sourceLabel: source === undefined ? undefined : sourceLabel(source),
		specRevision: e.spec_revision,
		checked: formatDay(e.last_checked_date)
	};
};

export const overview = (site: Site): ReadonlyArray<RoleView> =>
	Array.map(roles, (role) => ({
		role,
		id: roleIds[role],
		name: roleNames[role],
		categories: Array.map(categoriesByRole[role], (id): CategoryView => {
			const inCategory = Array.filter(site.entries, (e) => e.category === id);
			const chips = (featured: boolean) =>
				Array.sort(
					Array.map(
						Array.filter(inCategory, (e) => e.featured === featured),
						toChip
					),
					chipOrder
				);
			return { id, name: categoryNames[id], featured: chips(true), more: chips(false) };
		})
	}));

export interface Side {
	readonly role: Role;
	readonly id: string;
	readonly name: string;
	readonly verdict: string;
	readonly done: number;
	readonly working: number;
	readonly featured: number;
	readonly categories: ReadonlyArray<{ readonly id: Category; readonly name: string }>;
}
