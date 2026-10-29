import { Array, DateTime, Match, Option, Order, Schema, String as Str } from 'effect';
import { type ChangeRow, changeAnchor, formatDay, utcDay } from './derive.ts';
import { GitHubItemPath } from './formats.ts';
import type { State } from './schema.ts';
import type { Site } from './site.ts';

export interface ChangesRow {
	readonly anchor: string;
	readonly day: string;
	readonly date: string;
	readonly name: string;
	/** The state it moved to, for the glyph. Spec revision rows have none. */
	readonly state: State | undefined;
	readonly change: string;
	readonly source: string;
	readonly sourceLabel: string;
}

export interface Week {
	readonly id: string;
	readonly label: string;
	readonly rows: ReadonlyArray<ChangesRow>;
}

/** A short name for the source: the version it shipped in, the PR or issue, the commit, or the kind of page. */
const sourceLabel = (r: ChangeRow): string => {
	const { hostname, pathname } = new URL(r.source);
	const item = Option.getOrUndefined(Schema.decodeUnknownOption(GitHubItemPath)(pathname));
	const host = Str.replace(/^www\./u, '')(hostname);
	return Match.value({ ...r, item, host }).pipe(
		Match.when({ version: Match.string }, ({ version }) => version),
		Match.when({ item: Match.defined }, ({ item: [, , , kind, , id] }) =>
			Match.value(kind).pipe(
				Match.when('pull', () => `PR #${id}`),
				Match.when('issues', () => `#${id}`),
				Match.when('commit', () => id.slice(0, 7)),
				Match.exhaustive
			)
		),
		Match.when({ host: Match.is('x.com', 'twitter.com') }, () => 'post on X'),
		Match.when({ to: 'done' }, () => `${Str.split(r.name, ' ')[0]} docs`),
		Match.orElse(() => host)
	);
};

const entryRow = (r: ChangeRow): ChangesRow => ({
	anchor: changeAnchor(r),
	day: r.day,
	date: formatDay(r.date),
	name: r.name,
	state: r.to,
	change: r.from === undefined ? `added as ${r.to}` : `${r.from} → ${r.to}`,
	source: r.source,
	sourceLabel: sourceLabel(r)
});

const specRow = (s: Site['spec']['revisions'][number], i: number): ChangesRow => {
	const date = DateTime.makeUnsafe(s.date);
	return {
		anchor: `spec-${s.number}`,
		day: utcDay(date),
		date: formatDay(date),
		name: 'Spec',
		state: undefined,
		change: i === 0 ? `published, revision ${s.number}` : `revision ${s.number}`,
		source: s.url,
		sourceLabel: new URL(s.url).hash === '#revision-history' ? 'revision history' : 'announcement'
	};
};

const byName = Order.mapInput(Str.Order, (r: ChangesRow) => r.name.toLowerCase());
const newestDayFirst = Order.combine(
	Order.flip(Order.mapInput(Str.Order, (r: ChangesRow) => r.day)),
	byName
);

const weekOf = (day: string) =>
	DateTime.startOf(DateTime.makeUnsafe(day), 'week', { weekStartsOn: 1 });

/** The Changes page: state changes and spec revisions, newest first, in Monday-start UTC weeks. A week before the newest row's year names its year. */
export const changeWeeks = (site: Site): ReadonlyArray<Week> => {
	const rows = Array.sort(
		[...Array.map(site.changes, entryRow), ...Array.map(site.spec.revisions, specRow)],
		newestDayFirst
	);
	if (!Array.isReadonlyArrayNonEmpty(rows)) return [];
	const newestYear = DateTime.getPartUtc(DateTime.makeUnsafe(Array.headNonEmpty(rows).day), 'year');
	return Array.map(
		Array.groupWith(rows, (a, b) => utcDay(weekOf(a.day)) === utcDay(weekOf(b.day))),
		(week) => {
			const monday = weekOf(Array.headNonEmpty(week).day);
			const day =
				DateTime.getPartUtc(monday, 'year') === newestYear
					? formatDay(monday)
					: DateTime.formatUtc(monday, { locale: 'en-US', dateStyle: 'medium' });
			return { id: `week-${utcDay(monday)}`, label: `Week of ${day}`, rows: week };
		}
	);
};
