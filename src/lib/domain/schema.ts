import { Array, DateTime, Option, Schema } from 'effect';
import { Day, DayOrTime, githubRepoOf, Repo, sameRepo, Url } from './formats.ts';

export const states = ['done', 'working', 'blocked', 'idle', 'error'] as const;
export type State = (typeof states)[number];

export const roles = ['program', 'terminal'] as const;
export type Role = (typeof roles)[number];

export const categoriesByRole = {
	program: ['coding-agents', 'clis', 'libraries'],
	terminal: ['emulators', 'multiplexers', 'engines']
} as const;
export type Category = (typeof categoriesByRole)[Role][number];

export const HistoryBlock = Schema.Struct({
	date: DayOrTime.pipe(
		Schema.annotateEncoded({
			description: 'When the state or its evidence changed. A date-time is in UTC.'
		})
	),
	state: Schema.Literals(states).pipe(
		Schema.annotateEncoded({ description: 'The state from this date on.' })
	),
	source: Url.pipe(
		Schema.annotateEncoded({
			description: 'The PR, commit, release, issue or docs page that shows this state.'
		})
	),
	version: Schema.optionalKey(
		Schema.String.pipe(Schema.annotateEncoded({ description: 'The release that shipped support.' }))
	)
});
export type HistoryBlock = typeof HistoryBlock.Type;

export const Github = Schema.Struct({
	popular: Schema.Boolean.pipe(
		Schema.annotateEncoded({ description: 'At least 1,000 GitHub stars at the last check.' })
	)
}).pipe(
	Schema.annotateEncoded({ description: "Written by the weekly checker. Don't edit it by hand." })
);

export const entryFields = {
	name: Schema.String,
	url: Url.pipe(
		Schema.annotateEncoded({
			description: "The project's homepage, or its repository if it has no homepage."
		})
	),
	repo: Schema.optionalKey(
		Repo.pipe(
			Schema.annotateEncoded({
				description:
					"The GitHub owner/name that the weekly checker watches. Leave it out for projects that aren't on GitHub."
			})
		)
	),
	release_prefix: Schema.optionalKey(
		Schema.String.pipe(
			Schema.annotateEncoded({
				description:
					"For a repo that releases several packages, how this package's release tags start, such as @expo/cli@. The weekly checker then looks only at those releases."
			})
		)
	),
	role: Schema.Literals(roles).pipe(
		Schema.annotateEncoded({
			description: 'program if it sends status reports, terminal if it shows them.'
		})
	),
	category: Schema.Literals([...categoriesByRole.program, ...categoriesByRole.terminal]),
	is_featured: Schema.optionalKey(
		Schema.Boolean.pipe(
			Schema.annotateEncoded({
				description:
					'Set true to feature an entry with fewer than 1,000 stars, or false to hide one with more. Leave it out to go by stars.'
			})
		)
	),
	aliases: Schema.optionalKey(
		Schema.Array(Schema.String).pipe(
			Schema.annotateEncoded({
				description: 'Other names that search should match, such as agentd for agtd.'
			})
		)
	),
	spec_revision: Schema.String.pipe(
		Schema.annotateEncoded({
			description: 'The OSC 7501 spec revision of the last check, such as 0.4.'
		})
	),
	note: Schema.optionalKey(
		Schema.String.pipe(
			Schema.annotateEncoded({
				description: 'A caveat that the popover shows, such as how to turn support on.'
			})
		)
	),
	last_checked_date: Schema.optionalKey(
		Day.pipe(
			Schema.annotateEncoded({
				description:
					'When a person last checked this entry. Leave it out if the weekly checker can follow its last history block.'
			})
		)
	),
	github: Schema.optionalKey(Github),
	history: Schema.Array(HistoryBlock).pipe(
		Schema.annotateEncoded({
			description:
				'State changes, oldest first. The last block is the current state, and no blocks means idle.'
		})
	)
};

// The category rule as JSON Schema, so Tombi and data.json readers get it too. The other
// rules run only in the decoder.
// `then` is JSON Schema's keyword here, never a promise.
// oxlint-disable-next-line unicorn/no-thenable
const ifThen = (cond: object, then: object) => ({ if: cond, then });

const entryRulesJsonSchema = () => ({
	allOf: roles.map((role) =>
		ifThen(
			{ properties: { role: { const: role } }, required: ['role'] },
			{ properties: { category: { enum: [...categoriesByRole[role]] } } }
		)
	)
});

type EntryForRules = {
	readonly url: string;
	readonly repo?: string;
	readonly role: Role;
	readonly category: Category;
	readonly history: ReadonlyArray<HistoryBlock>;
};

/** One issue at `path` when `failed`, otherwise none. */
const issueIf = (
	failed: boolean,
	path: ReadonlyArray<PropertyKey>,
	issue: string
): Array<Schema.FilterIssue> => (failed ? [{ path, issue }] : []);

const categoryFitsRole = (e: EntryForRules) =>
	issueIf(
		!Array.contains<Category>(categoriesByRole[e.role], e.category),
		['category'],
		`${e.category} isn't a ${e.role} category`
	);

const githubUrlHasRepo = (e: EntryForRules) =>
	Option.match(githubRepoOf(e.url), {
		onNone: () => [],
		onSome: (urlRepo) =>
			issueIf(
				e.repo === undefined || !sameRepo(e.repo, urlRepo),
				['repo'],
				`a GitHub url needs repo = "${urlRepo}" for the checker`
			)
	});

// Projects off GitHub can be done from their official docs, with no version.
const doneHasVersion = (e: EntryForRules) =>
	Array.flatMap(e.history, (h, i) =>
		issueIf(
			h.state === 'done' && h.version === undefined && e.repo !== undefined,
			['history', i, 'version'],
			'a done block needs a version'
		)
	);

const historyInOrder = (e: EntryForRules) =>
	Array.flatMap(e.history, (h, i) =>
		Option.match(Array.get(e.history, i - 1), {
			onNone: () => [],
			onSome: (prev) =>
				issueIf(
					DateTime.isLessThan(h.date, prev.date),
					['history', i, 'date'],
					'history must be in date order'
				)
		})
	);

/** Cross-field rules for an entry. Also applied to each entry in data.json. */
export const entryRules = Schema.makeFilter<EntryForRules>(
	(e) =>
		Array.flatMap([categoryFitsRole, githubUrlHasRepo, doneHasVersion, historyInOrder], (rule) =>
			rule(e)
		),
	{ toJsonSchema: entryRulesJsonSchema }
);

/** One project, as stored in data/entries/<slug>.toml. */
export const Entry = Schema.Struct(entryFields).check(entryRules);
export type Entry = typeof Entry.Type;

export const SpecRevision = Schema.Struct({ number: Schema.String, date: Day, url: Url });

/** data/checker.toml, written by the weekly checker. */
export const Checker = Schema.Struct({ last_run: Day });

/** data/spec.toml */
export const Spec = Schema.Struct({
	revision: Schema.NonEmptyArray(SpecRevision)
});
export type Spec = typeof Spec.Type;
