import * as Gh from '@distilled.cloud/github';
import { Array, DateTime, Effect, Equivalence, Option, Struct } from 'effect';
import { featuredStars } from '../../src/lib/domain/derive.ts';
import { githubRepoOf, sameRepo } from '../../src/lib/domain/formats.ts';
import type { SlugEntry } from '../../src/lib/domain/load.ts';
import type { Entry, HistoryBlock, State } from '../../src/lib/domain/schema.ts';

interface Change {
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

/** The pull, issue, commit or release a GitHub link in `repo` points to. */
const refOf = (url: string, repo: string) =>
	Option.flatMap(githubRepoOf(url), (r) => {
		const [, , kind, id, ...rest] = new URL(url).pathname.split('/').filter((s) => s !== '');
		return sameRepo(r, repo) &&
			id !== undefined &&
			(kind === 'pull' || kind === 'issues' || kind === 'commit' || kind === 'releases')
			? Option.some({
					kind,
					id,
					url: `https://github.com/${repo}/${[kind, id, ...rest].join('/')}`
				})
			: Option.none();
	});

/** Whether the checker can follow the entry's last history block. */
export const followable = ({ repo, history }: Entry) =>
	repo !== undefined &&
	Option.isSome(Option.flatMap(Array.last(history), (b) => refOf(b.source, repo)));

// Pre-release tags that a project may still publish as a full release, like `v1.0.0-rc.1` and
// Python's `0.6.0a1`. tmux's `3.6a` is a full release.
const preTag =
	/(?:^|[-._/])(?:nightly|tip|canary|alpha|beta|rc|pre|preview|dev|snapshot)\d*(?:[-._]|$)|\.\d+(?:a|b|rc)\d+$/iu;

/** Two releases with the same tag. */
const sameTag = Equivalence.mapInput(Equivalence.String, (r: { tag_name: string }) => r.tag_name);

/** The package part of a monorepo tag, like `radius-cli@` in `radius-cli@0.5.0`. */
const prefixOf = (tag: string) => tag.replace(/v?\d[\w.+-]*$/u, '');

interface Context {
	readonly repo: string;
	readonly owner: string;
	readonly name: string;
	readonly stable: ReadonlyArray<{ tag: string; url: string; published: DateTime.Utc }>;
	readonly now: DateTime.Utc;
}

/** The next history block the evidence calls for, or a note for a person. */
interface Step {
	readonly next?: HistoryBlock;
	readonly note?: string;
}

const none: Step = {};
const to = (next: HistoryBlock): Step => ({ next });

const reopenedAt = (n: number, ctx: Context) =>
	Gh.issues
		.listEvents({ owner: ctx.owner, repo: ctx.name, issue_number: n, per_page: 100 })
		.pipe(
			Effect.map((events) =>
				DateTime.makeUnsafe(events.findLast((e) => e.event === 'reopened')?.created_at ?? ctx.now)
			)
		);

const fromPull = (current: HistoryBlock, n: number, url: string, ctx: Context) =>
	Effect.gen(function* () {
		const pr = yield* Gh.pulls.get({ owner: ctx.owner, repo: ctx.name, pull_number: n });
		if (pr.merged_at !== null && pr.merge_commit_sha !== null) {
			const source = `https://github.com/${ctx.repo}/commit/${pr.merge_commit_sha}`;
			return to({ date: DateTime.makeUnsafe(pr.merged_at), state: 'working', source });
		}
		if (current.state === 'working' && pr.state === 'closed') {
			const date = DateTime.makeUnsafe(pr.closed_at ?? ctx.now);
			return to({ date, state: 'blocked', source: url });
		}
		if (current.state === 'blocked' && pr.state === 'open') {
			return to({ date: yield* reopenedAt(n, ctx), state: 'working', source: url });
		}
		return none;
	});

const fromCommit = (current: HistoryBlock, sha: string, ctx: Context) =>
	Effect.gen(function* () {
		const since = ctx.stable
			.filter((r) => DateTime.isGreaterThanOrEqualTo(r.published, current.date))
			.toSorted((a, b) => DateTime.Order(a.published, b.published));
		for (const r of since) {
			const { status } = yield* Gh.repos.compareCommits({
				owner: ctx.owner,
				repo: ctx.name,
				basehead: `${sha}...${r.tag}`,
				per_page: 1
			});
			if (status === 'ahead' || status === 'identical') {
				return to({ date: r.published, state: 'done', source: r.url, version: r.tag });
			}
		}
		return none;
	});

const fromIssue = (current: HistoryBlock, n: number, url: string, ctx: Context) =>
	Effect.gen(function* () {
		const issue = yield* Gh.issues.get({ owner: ctx.owner, repo: ctx.name, issue_number: n });
		if (current.state === 'error' && issue.state === 'open') {
			return to({ date: yield* reopenedAt(n, ctx), state: 'idle', source: url });
		}
		if (current.state === 'idle' && issue.state === 'closed') {
			if (issue.state_reason !== 'not_planned') {
				return { note: `${url} was closed as ${issue.state_reason ?? 'closed'}` };
			}
			const date = DateTime.makeUnsafe(issue.closed_at ?? ctx.now);
			return to({ date, state: 'error', source: url });
		}
		return none;
	});

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

/** Whether it's popular, the current stable release, and the stable releases on its release line. */
const refresh = (owner: string, name: string, previous: Entry['github']) =>
	Effect.gen(function* () {
		const { stargazers_count } = yield* Gh.repos.get({ owner, repo: name });
		const popular = stargazers_count >= featuredStars;
		const releases = yield* Gh.repos.listReleases({ owner, repo: name, per_page: 30 });
		const latest = yield* Gh.repos
			.getLatestRelease({ owner, repo: name })
			.pipe(Effect.catchTag('NotFound', () => Effect.succeed(null)));
		const tracked = previous?.latest_release_tag;
		// Stable means a full release, or whatever GitHub marks Latest, even with an rc tag. Latest
		// can be older than the newest 30 releases, so it joins them. A monorepo's entry stays on
		// the release line it already tracks. Newest published first.
		const stable = Array.unionWith(releases, latest === null ? [] : [latest], sameTag)
			.flatMap((r) =>
				!r.draft &&
				r.published_at !== null &&
				(r.tag_name === latest?.tag_name || (!r.prerelease && !preTag.test(r.tag_name))) &&
				(tracked === undefined || prefixOf(r.tag_name) === prefixOf(tracked))
					? [{ tag: r.tag_name, url: r.html_url, published: DateTime.makeUnsafe(r.published_at) }]
					: []
			)
			.toSorted((a, b) => DateTime.Order(b.published, a.published));
		// GitHub's Latest, unless a release published after it contains it: some projects leave the
		// badge on an old release. A backport also comes after Latest, but it doesn't contain it.
		// A monorepo's Latest can be on another line, and then it's the newest on this one.
		const current = yield* Array.findFirst(stable, (r) => r.tag === latest?.tag_name).pipe(
			Option.match({
				onNone: () => Effect.succeed(Array.head(stable)),
				onSome: (l) =>
					Effect.findFirst(
						stable.filter((r) => DateTime.isGreaterThan(r.published, l.published)),
						(r) =>
							Gh.repos
								.compareCommits({ owner, repo: name, basehead: `${l.tag}...${r.tag}`, per_page: 1 })
								.pipe(Effect.map(({ status }) => status === 'ahead' || status === 'identical'))
					).pipe(Effect.map(Option.orElse(() => Option.some(l))))
			})
		);
		const github = Option.match(current, {
			onNone: () => ({ ...previous, popular }),
			onSome: (r) => ({
				popular,
				latest_release_tag: r.tag,
				latest_release_date: DateTime.removeTime(r.published)
			})
		});
		return { github, stable };
	});

/** Refreshes `[github]` and walks the history forward as far as the evidence goes. */
export const checkEntry = (entry: SlugEntry, now: DateTime.Utc, lastRun: DateTime.Utc) =>
	Effect.gen(function* () {
		const { repo } = entry;
		if (repo === undefined) return { entry, changes: [], notes: [] } satisfies Checked;
		const [owner = '', name = ''] = repo.split('/');
		const { github, stable } = yield* refresh(owner, name, entry.github);
		const history = [...entry.history];
		const changes: Array<Change> = [];
		const notes: Array<string> = [];
		// A merged PR can be released in the same week, so take up to three steps.
		for (let i = 0; i < 3; i++) {
			const current = history.at(-1);
			if (current === undefined) break;
			const { next, note } = yield* step(current, { repo, owner, name, stable, now });
			if (note !== undefined) notes.push(note);
			if (next === undefined) break;
			const b = { ...next, date: DateTime.max(next.date, current.date) };
			history.push(b);
			changes.push({ slug: entry.slug, from: current.state, to: b.state, source: b.source });
		}
		if (entry.note !== undefined && changes.some((c) => c.from !== c.to)) {
			notes.push(`${entry.slug} has a new state. Make sure its note is still true: ${entry.note}`);
		}
		// The run's date goes in data/checker.toml, so only entries checked by hand keep a date.
		const updated = { ...entry, github, history };
		const rechecked: SlugEntry = followable(updated)
			? Struct.omit(updated, ['last_checked_date'])
			: updated;
		return { entry: rechecked, changes, notes } satisfies Checked;
	}).pipe(
		Effect.catch((e) =>
			Effect.succeed({
				// This run didn't check it, so it keeps the date of the last run that did.
				entry: followable(entry)
					? { ...entry, last_checked_date: entry.last_checked_date ?? lastRun }
					: entry,
				changes: [],
				notes: [`Couldn't check ${entry.slug}: ${e.message}`]
			} satisfies Checked)
		)
	);
