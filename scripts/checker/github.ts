import * as Gh from '@distilled.cloud/github';
import { Context, DateTime, Effect, Layer, Option, Redacted, Schema } from 'effect';
import type { HttpClient } from 'effect/http';

const Time = Schema.DateTimeUtcFromString;

const Repo = Schema.Struct({ stargazers_count: Schema.Int });

export const Release = Schema.Struct({
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
export type Pull = typeof Pull.Type;

const Issue = Schema.Struct({
	state: Schema.Literals(['open', 'closed']),
	state_reason: Schema.NullOr(Schema.String),
	closed_at: Schema.NullOr(Time)
});
export type Issue = typeof Issue.Type;

const Event = Schema.Struct({ event: Schema.String, created_at: Time });

const Compare = Schema.Struct({ status: Schema.String });

export const SearchHit = Schema.Struct({
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

/** The GitHub REST calls the checker makes, decoded. */
export class GitHub extends Context.Service<
	GitHub,
	{
		readonly stars: (repo: string) => Effect.Effect<number, GitHubError>;
		readonly releases: (repo: string) => Effect.Effect<ReadonlyArray<Release>, GitHubError>;
		/** The release GitHub marks Latest, if any. */
		readonly latest: (repo: string) => Effect.Effect<Option.Option<Release>, GitHubError>;
		readonly pull: (repo: string, n: number) => Effect.Effect<Pull, GitHubError>;
		readonly issue: (repo: string, n: number) => Effect.Effect<Issue, GitHubError>;
		readonly reopenedAt: (
			repo: string,
			n: number
		) => Effect.Effect<Option.Option<DateTime.Utc>, GitHubError>;
		/** Whether `ref` (a tag) contains commit `sha`. */
		readonly contains: (
			repo: string,
			ref: string,
			sha: string
		) => Effect.Effect<boolean, GitHubError>;
		readonly search: (query: string) => Effect.Effect<ReadonlyArray<SearchHit>, GitHubError>;
	}
>()('GitHub') {}

export type GitHubError = Gh.GithubOpError | Schema.SchemaError | Error;

/** Every page of a search, which stops at 1,000 results, ten pages of 100. */
const searchAll = <E>(query: string, page: (n: number) => Effect.Effect<typeof Search.Type, E>) =>
	Effect.gen(function* () {
		const items: Array<SearchHit> = [];
		for (let n = 1; n <= 10; n++) {
			const s = yield* page(n);
			// GitHub timed out part of the search, so the hits can't be trusted as complete.
			if (s.incomplete_results) {
				return yield* Effect.fail(new Error(`search for ${query} came back incomplete`));
			}
			items.push(...s.items);
			if (s.items.length < 100) break;
		}
		return items;
	});

/** `owner/name` as the SDK's path parameters. */
const at = (repo: string) => {
	const [owner = '', name = ''] = repo.split('/');
	return { owner, repo: name };
};

/** GitHub through the Distilled SDK, authenticated with `token`, over the HttpClient in context. */
export const layer = (token: Redacted.Redacted) =>
	Layer.effect(
		GitHub,
		Effect.map(Effect.context<Gh.Credentials | HttpClient.HttpClient>(), (context) => {
			// The SDK passes bodies through undecoded, so decode the fields the checker reads.
			const get = <S extends Schema.Top, E>(
				schema: S,
				call: Effect.Effect<unknown, E, Gh.Credentials | HttpClient.HttpClient>
			) => call.pipe(Effect.flatMap(Schema.decodeUnknownEffect(schema)), Effect.provide(context));

			return GitHub.of({
				stars: (repo) =>
					get(Repo, Gh.repos.get(at(repo))).pipe(Effect.map((r) => r.stargazers_count)),
				releases: (repo) =>
					get(Schema.Array(Release), Gh.repos.listReleases({ ...at(repo), per_page: 30 })),
				latest: (repo) =>
					get(Release, Gh.repos.getLatestRelease(at(repo))).pipe(
						Effect.map(Option.some),
						Effect.catchTag('NotFound', () => Effect.succeedNone)
					),
				pull: (repo, n) => get(Pull, Gh.pulls.get({ ...at(repo), pull_number: n })),
				issue: (repo, n) => get(Issue, Gh.issues.get({ ...at(repo), issue_number: n })),
				// ponytail: first 100 events only, page through them if a tracked issue ever has more
				reopenedAt: (repo, n) =>
					get(
						Schema.Array(Event),
						Gh.issues.listEvents({ ...at(repo), issue_number: n, per_page: 100 })
					).pipe(
						Effect.map((events) =>
							Option.fromNullishOr(events.findLast((e) => e.event === 'reopened')?.created_at)
						)
					),
				contains: (repo, ref, sha) =>
					get(
						Compare,
						Gh.repos.compareCommits({ ...at(repo), basehead: `${sha}...${ref}`, per_page: 1 })
					).pipe(Effect.map((c) => c.status === 'ahead' || c.status === 'identical')),
				search: (query) =>
					searchAll(query, (page) =>
						get(Search, Gh.search.issuesAndPullRequests({ q: query, per_page: 100, page }))
					)
			});
		})
	).pipe(Layer.provide(Gh.credentials({ token })));
