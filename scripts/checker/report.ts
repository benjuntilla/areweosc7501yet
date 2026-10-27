// The weekly PR body: candidates from GitHub search, and the Markdown that lists every finding.
import * as Gh from '@distilled.cloud/github';
import { Array, DateTime, Effect, Option } from 'effect';
import { markdownTable } from 'markdown-table';
import { sameRepo } from '../../src/lib/domain/formats.ts';
import type { Checked } from './check.ts';

const queries = ['"OSC 7501"', '"Program Status Protocol"'];
// Search also matches issue #7501 and words apart, so a hit must name the protocol itself.
const mentions = /osc[\s-]*7501|program status protocol/iu;
export const staleDays = 30;

/** One issue or PR per untracked repo that mentioned the protocol in the past week. */
export const candidates = (tracked: ReadonlyArray<string>, since: DateTime.Utc) =>
	Effect.gen(function* () {
		const hits: Array<Gh.search.IssueSearchResultItem> = [];
		for (const q of queries) {
			// Search stops at 1,000 results, ten pages of 100.
			for (let page = 1; page <= 10; page++) {
				const s = yield* Gh.search.issuesAndPullRequests({
					q: `${q} created:>=${DateTime.formatIsoDateUtc(since)}`,
					per_page: 100,
					page
				});
				// GitHub timed out part of the search, so the hits can't be trusted as complete.
				if (s.incomplete_results) {
					return yield* Effect.fail(new Error(`search for ${q} came back incomplete`));
				}
				hits.push(...s.items);
				if (s.items.length < 100) break;
			}
		}
		const found = Array.dedupeWith(
			hits.filter(
				(h) =>
					h.user?.type !== 'Bot' &&
					mentions.test(`${h.title}\n${h.body ?? ''}`) &&
					!tracked.some((r) => sameRepo(r, repoOf(h)))
			),
			(a, b) => repoOf(a) === repoOf(b)
		);
		// A fork whose parent or source is tracked is covered by that repo's entry.
		return yield* Effect.filter(
			found,
			(h) => {
				const [owner = '', repo = ''] = repoOf(h).split('/');
				return Gh.repos
					.get({ owner, repo })
					.pipe(
						Effect.map(
							({ parent, source }) =>
								![parent, source].some(
									(f) => f !== undefined && tracked.some((r) => sameRepo(r, f.full_name))
								)
						)
					);
			},
			{ concurrency: 4 }
		);
	});

const repoOf = (h: Gh.search.IssueSearchResultItem) =>
	h.repository_url.replace('https://api.github.com/repos/', '');

// Titles come from strangers: show them as plain text, without pinging people or linking issues here.
const inert = (s: string) =>
	s.replaceAll(/[[\]\\|<>`*_~]/gu, (c) => `\\${c}`).replaceAll(/[@#]/gu, (c) => `${c}\u200B`);

export const body = (
	results: ReadonlyArray<Checked>,
	found: Option.Option<ReadonlyArray<Gh.search.IssueSearchResultItem>>,
	stale: ReadonlyArray<{ slug: string; last: string }>
) => {
	const changes = results.flatMap((r) => r.changes);
	const notes = results.flatMap((r) => r.notes);
	const text = [
		'## History changes',
		changes.length === 0
			? 'None.'
			: markdownTable([
					['Entry', 'From', 'To', 'Evidence'],
					...changes.map((c) => [c.slug, c.from, c.to, c.source])
				]),
		...(notes.length === 0 ? [] : ['## Needs a look', notes.map((n) => `- ${n}`).join('\n')]),
		'## Candidates',
		Option.match(found, {
			onNone: () => "The search failed or came back incomplete. The run's log has the error.",
			onSome: (hits) =>
				hits.length === 0
					? 'None.'
					: hits.map((h) => `- ${repoOf(h)}: [${inert(h.title)}](${h.html_url})`).join('\n')
		}),
		`## Not verified in ${staleDays} days`,
		stale.length === 0
			? 'None.'
			: stale.map((s) => `- ${s.slug}, last checked ${s.last}`).join('\n')
	].join('\n\n');
	// GitHub adds a "mentioned this" event to each issue or PR that a PR body links to.
	// redirect.github.com links don't add one, which is why Dependabot uses them.
	return text.replaceAll('https://github.com/', 'https://redirect.github.com/');
};
