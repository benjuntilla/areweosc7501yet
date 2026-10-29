import { Array, Match, Option, Order, Schema, String as Str } from 'effect';
import { formatDay } from './derive.ts';
import { GitHubItemPath, Repo } from './formats.ts';
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

/** The path of a link to a GitHub release, like /owner/name/releases/tag/v1.2. */
const GitHubReleasePath = Schema.TemplateLiteralParser([
	'/',
	Repo,
	'/releases/tag/',
	Schema.String
]);

/** A short name for a source link: owner/name@sha, owner/name#123, owner/name v1.2 or the bare URL. */
export const sourceLabel = (url: string): string => {
	const { hostname, pathname } = new URL(url);
	return Match.value({
		hostname,
		item: Option.getOrUndefined(Schema.decodeUnknownOption(GitHubItemPath)(pathname)),
		release: Option.getOrUndefined(Schema.decodeUnknownOption(GitHubReleasePath)(pathname))
	}).pipe(
		Match.not({ hostname: 'github.com' }, () => Str.replace(/^https:\/\/(www\.)?/u, '')(url)),
		Match.when({ item: Match.defined }, ({ item: [, repo, , kind, , id] }) =>
			Match.value(kind).pipe(
				Match.when(Match.is('pull', 'issues'), () => `${repo}#${id}`),
				Match.when('commit', () => `${repo}@${id.slice(0, 7)}`),
				Match.exhaustive
			)
		),
		Match.when({ release: Match.defined }, ({ release: [, repo, , tag] }) => `${repo} ${tag}`),
		Match.orElse(() => Str.replace(/^https:\/\/github\.com\//u, '')(url))
	);
};

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
