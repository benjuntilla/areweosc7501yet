import { Array, DateTime, Effect, Option, Order } from 'effect';
import { githubRepoOf, sameRepo } from '../../src/lib/domain/formats.ts';
import type { SlugEntry } from '../../src/lib/domain/load.ts';
import type { Entry, HistoryBlock, State } from '../../src/lib/domain/schema.ts';
import * as GitHub from './github.ts';

export interface Change {
	readonly slug: string;
	readonly from: State;
	readonly to: State;
	readonly source: string;
}

export interface Checked {
	readonly entry: SlugEntry;
	readonly changes: ReadonlyArray<Change>;
	/** Things it saw but can't turn into a state, for a person to look at. */
	readonly notes: ReadonlyArray<string>;
}

type Kind = 'pull' | 'issues' | 'commit' | 'releases';

/** The pull, issue, commit or release a GitHub link in `repo` points to. */
const refOf = (url: string, repo: string): Option.Option<{ kind: Kind; id: string; url: string }> =>
	Option.flatMap(githubRepoOf(url), (r) => {
		if (!sameRepo(r, repo)) return Option.none();
		const { pathname } = new URL(url);
		const [, , kind, ...rest] = pathname.split('/').filter((s) => s !== '');
		const id = kind === 'releases' ? rest.slice(1).join('/') : rest[0];
		return (kind === 'pull' || kind === 'issues' || kind === 'commit' || kind === 'releases') &&
			id !== undefined &&
			id !== ''
			? Option.some({ kind, id, url: `https://github.com/${repo}/${kind}/${rest.join('/')}` })
			: Option.none();
	});

// Pre-release tags that a project may still publish as a full release.
const preTag =
	/(?:^|[-._/])(?:nightly|tip|canary|alpha|beta|rc|pre|preview|dev|snapshot)\d*(?:[-._]|$)/iu;

/**
 * Stable means what the normal update path delivers: a full release, or whatever GitHub marks
 * Latest, even with an rc tag.
 */
const isStable =
	(latestTag: Option.Option<string>) =>
	(r: GitHub.Release): r is GitHub.Release & { published_at: DateTime.Utc } =>
		!r.draft &&
		r.published_at !== null &&
		(Option.contains(latestTag, r.tag_name) || (!r.prerelease && !preTag.test(r.tag_name)));

/** The package part of a monorepo tag, like `radius-cli@` in `radius-cli@0.5.0`. */
const prefixOf = (tag: string) => tag.replace(/v?\d[\w.+-]*$/u, '');

const byPublished = Order.mapInput(
	DateTime.Order,
	(r: { published_at: DateTime.Utc }) => r.published_at
);

const block = (state: State, date: DateTime.Utc, source: string, version?: string): HistoryBlock =>
	version === undefined ? { date, state, source } : { date, state, source, version };

interface Context {
	readonly repo: string;
	readonly stable: ReadonlyArray<GitHub.Release & { published_at: DateTime.Utc }>;
	readonly now: DateTime.Utc;
}

interface Step {
	readonly next: Option.Option<HistoryBlock>;
	readonly note: Option.Option<string>;
}

const none: Step = { next: Option.none(), note: Option.none() };
const to = (b: HistoryBlock): Step => ({ ...none, next: Option.some(b) });

const fromPull = (current: HistoryBlock, n: number, url: string, ctx: Context) =>
	Effect.gen(function* () {
		const pr = yield* GitHub.pull(ctx.repo, n);
		if (pr.merged_at !== null && pr.merge_commit_sha !== null) {
			const commit = `https://github.com/${ctx.repo}/commit/${pr.merge_commit_sha}`;
			return to(block('working', pr.merged_at, commit));
		}
		if (current.state === 'working' && pr.state === 'closed') {
			return to(block('blocked', pr.closed_at ?? ctx.now, url));
		}
		if (current.state === 'blocked' && pr.state === 'open') {
			const at = yield* GitHub.reopenedAt(ctx.repo, n);
			return to(
				block(
					'working',
					Option.getOrElse(at, () => ctx.now),
					url
				)
			);
		}
		return none;
	});

const fromCommit = (current: HistoryBlock, sha: string, ctx: Context) =>
	Effect.gen(function* () {
		// ponytail: tries the 10 oldest stable releases since the merge, enough for weekly runs
		const candidates = ctx.stable
			.filter((r) => DateTime.isGreaterThanOrEqualTo(r.published_at, current.date))
			.toSorted(byPublished)
			.slice(0, 10);
		for (const r of candidates) {
			if (yield* GitHub.contains(ctx.repo, r.tag_name, sha)) {
				return to(block('done', r.published_at, r.html_url, r.tag_name));
			}
		}
		return none;
	});

const fromIssue = (current: HistoryBlock, n: number, url: string, ctx: Context) =>
	Effect.gen(function* () {
		const issue = yield* GitHub.issue(ctx.repo, n);
		if (current.state === 'error' && issue.state === 'open') {
			const at = yield* GitHub.reopenedAt(ctx.repo, n);
			return to(
				block(
					'idle',
					Option.getOrElse(at, () => ctx.now),
					url
				)
			);
		}
		if (current.state === 'idle' && issue.state === 'closed') {
			return issue.state_reason === 'not_planned'
				? to(block('error', issue.closed_at ?? ctx.now, url))
				: { ...none, note: Option.some(`${url} was closed as ${issue.state_reason ?? 'closed'}`) };
		}
		return none;
	});

/** The next history block the evidence calls for, plus any note. */
const step = (current: HistoryBlock, ctx: Context) =>
	Option.match(refOf(current.source, ctx.repo), {
		onNone: () => Effect.succeed(none),
		onSome: ({ kind, id, url }) => {
			if (kind === 'pull' && (current.state === 'working' || current.state === 'blocked')) {
				return fromPull(current, Number(id), url, ctx);
			}
			if (kind === 'commit' && current.state === 'working') return fromCommit(current, id, ctx);
			if (kind === 'issues' && (current.state === 'idle' || current.state === 'error')) {
				return fromIssue(current, Number(id), url, ctx);
			}
			return Effect.succeed(none);
		}
	});

/** Stars, the newest stable release, and the stable releases on the entry's release line. */
const refresh = (repo: string, previous: Entry['github']) =>
	Effect.gen(function* () {
		const [stars, releases, latest] = yield* Effect.all(
			[GitHub.stars(repo), GitHub.releases(repo), GitHub.latest(repo)],
			{ concurrency: 3 }
		);
		// A monorepo's entry follows the release line it already tracks.
		const prefix = Option.map(Option.fromNullishOr(previous?.latest_release_tag), prefixOf);
		const stable = releases.filter(isStable(Option.map(latest, (r) => r.tag_name))).filter((r) =>
			Option.getOrElse(
				Option.map(prefix, (p) => prefixOf(r.tag_name) === p),
				() => true
			)
		);
		// GitHub lists releases newest tag first, which publish dates of backports don't follow.
		const github = Option.match(Array.head(stable), {
			onNone: () => ({ ...previous, stars }),
			onSome: (r) => ({
				stars,
				latest_release_tag: r.tag_name,
				latest_release_date: DateTime.removeTime(r.published_at)
			})
		});
		return { github, stable };
	});

/** Refreshes `[github]` and walks the history forward as far as the evidence goes. */
export const checkEntry = (entry: SlugEntry, now: DateTime.Utc) =>
	Effect.gen(function* () {
		const repo = entry.repo;
		if (repo === undefined) return { entry, changes: [], notes: [] } satisfies Checked;
		const { github, stable } = yield* refresh(repo, entry.github);
		const history = [...entry.history];
		const changes: Array<Change> = [];
		const notes: Array<string> = [];
		// A merged PR can be released in the same week, so take up to a few steps.
		for (let i = 0; i < 3; i++) {
			const current = Array.last(history);
			if (Option.isNone(current)) break;
			const { next, note } = yield* step(current.value, { repo, stable, now });
			if (Option.isSome(note)) notes.push(note.value);
			if (Option.isNone(next)) break;
			const b = { ...next.value, date: DateTime.max(next.value.date, current.value.date) };
			history.push(b);
			changes.push({ slug: entry.slug, from: current.value.state, to: b.state, source: b.source });
		}
		const verified = Option.exists(Array.last(history), (b) =>
			Option.isSome(refOf(b.source, repo))
		);
		const updated: SlugEntry = {
			...entry,
			github,
			history,
			last_checked_date: verified ? DateTime.removeTime(now) : entry.last_checked_date
		};
		return { entry: updated, changes, notes } satisfies Checked;
	}).pipe(
		Effect.catch((e) =>
			Effect.succeed({
				entry,
				changes: [],
				notes: [`Couldn't check ${entry.slug}: ${e.message}`]
			} satisfies Checked)
		)
	);
