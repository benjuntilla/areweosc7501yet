import { Array, DateTime, Option, Order } from 'effect';
import { Feed } from 'feed';
import { type ChangeRow, changeAnchor } from './derive.ts';
import type { Site } from './site.ts';

export const origin = 'https://areweosc7501yet.com';
const title = 'Are we OSC 7501 yet?';
const limit = 50;

interface Item {
	readonly id: string;
	readonly title: string;
	readonly anchor: string;
	readonly date: DateTime.Utc;
	readonly source: string;
}

const changeText = (r: ChangeRow): string =>
	r.from === undefined ? `added as ${r.to}` : `${r.from} → ${r.to}`;

const entryItem = (r: ChangeRow): Item => ({
	id: `tag:areweosc7501yet.com,2026:${r.slug}/${DateTime.formatIso(r.date)}/${r.to}`,
	title: `${r.name}: ${changeText(r)}`,
	anchor: changeAnchor(r),
	date: r.date,
	source: r.source
});

const specItem = (s: Site['spec']['revisions'][number]): Item => ({
	id: `tag:areweosc7501yet.com,2026:spec/${s.number}`,
	title: `Spec revision ${s.number}`,
	anchor: `spec-${s.number}`,
	date: DateTime.makeUnsafe(s.date),
	source: s.url
});

const newestFirst = Order.flip(Order.mapInput(DateTime.Order, (i: Item) => i.date));

/** The Changes rows as Atom 1.0, newest first, capped at the latest 50. */
export const toAtom = (site: Site): string => {
	const items = Array.take(
		Array.sort(
			[...Array.map(site.changes, entryItem), ...Array.map(site.spec.revisions, specItem)],
			newestFirst
		),
		limit
	);
	const feed = new Feed({
		id: `${origin}/`,
		title,
		description: 'Every state change for a featured entry, newest first.',
		link: `${origin}/changes`,
		feedLinks: { atom: `${origin}/feed.xml` },
		...Option.match(Array.head(items), {
			onNone: () => ({}),
			onSome: (i) => ({ updated: DateTime.toDateUtc(i.date) })
		}),
		author: { name: 'Ben Juntilla & community', link: origin },
		copyright: 'Data is CC0.',
		generator: false
	});
	for (const i of items)
		feed.addItem({
			id: i.id,
			title: i.title,
			link: `${origin}/changes#${i.anchor}`,
			date: DateTime.toDateUtc(i.date),
			content: `<p><a href="${i.source.replaceAll('&', '&amp;')}">Source</a></p>`
		});
	return feed.atom1();
};
