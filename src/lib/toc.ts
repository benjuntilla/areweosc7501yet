import type { State } from './domain/schema.ts';

export interface TocEntry {
	readonly id: string;
	readonly label: string;
	/** Shows the state's glyph in front, for Methodology's definitions. */
	readonly state?: State;
}

export const contributeSections = [
	{ id: 'report-a-change', label: 'Report a change' },
	{ id: 'edit-the-data', label: 'Edit the data' },
	{ id: 'the-site', label: 'The site' }
] as const satisfies ReadonlyArray<TocEntry>;

/** Each text page's sections, in page order. The nav unfolds them under the current page. */
export const tocs: Readonly<Record<string, ReadonlyArray<TocEntry>>> = {
	'/contribute': contributeSections
};
