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

export const methodologySections = [
	{ id: 'definition-of-done', label: 'Definition of done', state: 'done' },
	{ id: 'definition-of-working', label: 'Definition of working', state: 'working' },
	{ id: 'definition-of-blocked', label: 'Definition of blocked', state: 'blocked' },
	{ id: 'definition-of-idle', label: 'Definition of idle', state: 'idle' },
	{ id: 'definition-of-error', label: 'Definition of error', state: 'error' },
	{ id: 'the-verdict', label: 'The verdict' },
	{ id: 'programs-and-terminals', label: 'Programs and terminals' },
	{ id: 'featured-entries', label: 'Featured entries' },
	{ id: 'spec-revisions', label: 'Spec revisions' },
	{ id: 'weekly-checks', label: 'Weekly checks' },
	{ id: 'data-sources', label: 'Data sources' }
] as const satisfies ReadonlyArray<TocEntry>;

/** Each text page's sections, in page order. The nav unfolds them under the current page. */
export const tocs: Readonly<Record<string, ReadonlyArray<TocEntry>>> = {
	'/methodology': methodologySections,
	'/contribute': contributeSections
};
