import { Array, DateTime, Match, Order, String as Str } from 'effect';
import { type ChangeRow, changeAnchor, formatDay, utcDay } from './derive.ts';
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
	// A GitHub link reads /owner/name/<kind>/<id>.
	const [, , kind, id = ''] = Str.split(pathname.slice(1), '/');
	const host = Str.replace(/^www\./u, '')(hostname);
	return Match.value({ ...r, kind, host }).pipe(
		Match.when({ version: Match.string }, ({ version }) => version),
		Match.when({ kind: 'pull' }, () => `PR #${id}`),
		Match.when({ kind: 'issues' }, () => `#${id}`),
		Match.when({ kind: 'commit' }, () => id.slice(0, 7)),
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

/** The Changes page: state changes and spec revisions, newest first, in Monday-start UTC weeks. */
export const changeWeeks = (site: Site): ReadonlyArray<Week> => {
	const rows = Array.sort(
		[...Array.map(site.changes, entryRow), ...Array.map(site.spec.revisions, specRow)],
		newestDayFirst
	);
	if (!Array.isReadonlyArrayNonEmpty(rows)) return [];
	return Array.map(
		Array.groupWith(rows, (a, b) => utcDay(weekOf(a.day)) === utcDay(weekOf(b.day))),
		(week) => {
			const monday = weekOf(Array.headNonEmpty(week).day);
			return { id: `week-${utcDay(monday)}`, label: `Week of ${formatDay(monday)}`, rows: week };
		}
	);
};
