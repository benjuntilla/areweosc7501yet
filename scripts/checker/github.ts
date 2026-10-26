// The GitHub REST calls the checker makes, through the Distilled SDK. The SDK passes bodies
// through undecoded, so each call decodes the fields the checker reads.
import * as Gh from '@distilled.cloud/github';
import { Effect, Option, Schema } from 'effect';

/** The token from GITHUB_TOKEN or GH_TOKEN. */
export { CredentialsFromEnv } from '@distilled.cloud/github';

const Time = Schema.DateTimeUtcFromString;

const Repo = Schema.Struct({ stargazers_count: Schema.Int });

const Release = Schema.Struct({
	tag_name: Schema.String,
	html_url: Schema.String,
	draft: Schema.Boolean,
	prerelease: Schema.Boolean,
	published_at: Schema.NullOr(Time)
});
export type Release = typeof Release.Type;

const Pull = Schema.Struct({
	state: Schema.Literals(['open', 'closed']),
	merged_at: Schema.NullOr(Time),
	merge_commit_sha: Schema.NullOr(Schema.String),
	closed_at: Schema.NullOr(Time)
});

const Issue = Schema.Struct({
	state: Schema.Literals(['open', 'closed']),
	state_reason: Schema.NullOr(Schema.String),
	closed_at: Schema.NullOr(Time)
});

const Event = Schema.Struct({ event: Schema.String, created_at: Time });

const Compare = Schema.Struct({ status: Schema.String });

const SearchHit = Schema.Struct({
	html_url: Schema.String,
	title: Schema.String,
	body: Schema.NullOr(Schema.String),
	repository_url: Schema.String,
	user: Schema.Struct({ type: Schema.String })
});
export type SearchHit = typeof SearchHit.Type;

const Search = Schema.Struct({
	incomplete_results: Schema.Boolean,
	items: Schema.Array(SearchHit)
});

const decode =
	<S extends Schema.Top>(schema: S) =>
	<E, R>(call: Effect.Effect<unknown, E, R>) =>
		Effect.flatMap(call, Schema.decodeUnknownEffect(schema));

/** `owner/name` as the SDK's path parameters. */
const at = (repo: string) => {
	const [owner = '', name = ''] = repo.split('/');
	return { owner, repo: name };
};

export const stars = (repo: string) =>
	Gh.repos.get(at(repo)).pipe(
		decode(Repo),
		Effect.map((r) => r.stargazers_count)
	);

export const releases = (repo: string) =>
	Gh.repos.listReleases({ ...at(repo), per_page: 30 }).pipe(decode(Schema.Array(Release)));

/** The release GitHub marks Latest, if any. */
export const latest = (repo: string) =>
	Gh.repos.getLatestRelease(at(repo)).pipe(
		decode(Release),
		Effect.map(Option.some),
		Effect.catchTag('NotFound', () => Effect.succeedNone)
	);

export const pull = (repo: string, n: number) =>
	Gh.pulls.get({ ...at(repo), pull_number: n }).pipe(decode(Pull));

export const issue = (repo: string, n: number) =>
	Gh.issues.get({ ...at(repo), issue_number: n }).pipe(decode(Issue));

// ponytail: first 100 events only, page through them if a tracked issue ever has more
export const reopenedAt = (repo: string, n: number) =>
	Gh.issues.listEvents({ ...at(repo), issue_number: n, per_page: 100 }).pipe(
		decode(Schema.Array(Event)),
		Effect.map((events) =>
			Option.fromNullishOr(events.findLast((e) => e.event === 'reopened')?.created_at)
		)
	);

/** Whether `ref` (a tag) contains commit `sha`. */
export const contains = (repo: string, ref: string, sha: string) =>
	Gh.repos.compareCommits({ ...at(repo), basehead: `${sha}...${ref}`, per_page: 1 }).pipe(
		decode(Compare),
		Effect.map((c) => c.status === 'ahead' || c.status === 'identical')
	);

/** Every page of a search, which stops at 1,000 results, ten pages of 100. */
export const search = (query: string) =>
	Effect.gen(function* () {
		const items: Array<SearchHit> = [];
		for (let page = 1; page <= 10; page++) {
			const s = yield* Gh.search
				.issuesAndPullRequests({ q: query, per_page: 100, page })
				.pipe(decode(Search));
			// GitHub timed out part of the search, so the hits can't be trusted as complete.
			if (s.incomplete_results) {
				return yield* Effect.fail(new Error(`search for ${query} came back incomplete`));
			}
			items.push(...s.items);
			if (s.items.length < 100) break;
		}
		return items;
	});
