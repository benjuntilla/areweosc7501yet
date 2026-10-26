import { Array, DateTime, Option, Order, String as Str } from 'effect';
import { type ChangeRow, changeAnchor, formatDay, utcDay } from './derive.ts';
import * as patterns from './patterns.ts';
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
	if (r.version !== undefined) return r.version;
	const pr = Str.match(patterns.pullRequest)(r.source);
	if (Option.isSome(pr)) return `PR #${pr.value[1] ?? ''}`;
	const issue = /\/issues\/(\d+)/u.exec(r.source);
	if (issue) return `#${issue[1] ?? ''}`;
	const commit = /\/commit\/([0-9a-f]{7})/u.exec(r.source);
	if (commit) return commit[1] ?? '';
	const host = new URL(r.source).hostname.replace(/^www\./u, '');
	if (host === 'x.com' || host === 'twitter.com') return 'post on X';
	if (r.to === 'done') return `${r.name.split(' ')[0] ?? r.name} docs`;
	return host;
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
