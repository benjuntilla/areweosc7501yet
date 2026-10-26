import { Context, DateTime, Effect, Layer, Option, Redacted, Schedule, Schema } from 'effect';
import { HttpClient, HttpClientError, HttpClientRequest, HttpClientResponse } from 'effect/http';

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

const statusOf = (e: HttpClientError.HttpClientError) => e.response?.status;

// Secondary rate limits come back as 403 or 429 with retry-after, which retryTransient honors.
const rateLimited = (e: HttpClientError.HttpClientError) =>
	(statusOf(e) === 403 || statusOf(e) === 429) && e.response?.headers['retry-after'] !== undefined;

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

export type GitHubError = HttpClientError.HttpClientError | Schema.SchemaError | Error;

const authed = (client: HttpClient.HttpClient, token: Redacted.Redacted) =>
	client.pipe(
		HttpClient.mapRequest((req) =>
			req.pipe(
				HttpClientRequest.prependUrl('https://api.github.com'),
				HttpClientRequest.bearerToken(Redacted.value(token)),
				HttpClientRequest.acceptJson,
				HttpClientRequest.setHeader('x-github-api-version', '2022-11-28')
			)
		),
		HttpClient.filterStatusOk,
		HttpClient.retryTransient({
			while: rateLimited,
			schedule: Schedule.exponential('2 seconds'),
			times: 5
		})
	);

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

/** GitHub over `client`, authenticated with `token`. */
export const make = (client: HttpClient.HttpClient, token: Redacted.Redacted) => {
	const api = authed(client, token);
	const get = <S extends Schema.Top>(schema: S, path: string) =>
		api
			.get(path)
			.pipe(
				Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
				Effect.scoped
			) as Effect.Effect<S['Type'], GitHubError, S['DecodingServices']>;

	return GitHub.of({
		stars: (repo) => get(Repo, `/repos/${repo}`).pipe(Effect.map((r) => r.stargazers_count)),
		releases: (repo) => get(Schema.Array(Release), `/repos/${repo}/releases?per_page=30`),
		latest: (repo) =>
			get(Release, `/repos/${repo}/releases/latest`).pipe(
				Effect.map(Option.some),
				Effect.catchTag('HttpClientError', (e) =>
					statusOf(e) === 404 ? Effect.succeedNone : Effect.fail(e)
				)
			),
		pull: (repo, n) => get(Pull, `/repos/${repo}/pulls/${n}`),
		issue: (repo, n) => get(Issue, `/repos/${repo}/issues/${n}`),
		// ponytail: first 100 events only, page through them if a tracked issue ever has more
		reopenedAt: (repo, n) =>
			get(Schema.Array(Event), `/repos/${repo}/issues/${n}/events?per_page=100`).pipe(
				Effect.map((events) =>
					Option.fromNullishOr(events.findLast((e) => e.event === 'reopened')?.created_at)
				)
			),
		contains: (repo, ref, sha) =>
			get(Compare, `/repos/${repo}/compare/${sha}...${encodeURIComponent(ref)}?per_page=1`).pipe(
				Effect.map((c) => c.status === 'ahead' || c.status === 'identical')
			),
		search: (query) =>
			searchAll(query, (page) =>
				get(Search, `/search/issues?per_page=100&page=${page}&q=${encodeURIComponent(query)}`)
			)
	});
};

/** GitHub from the HttpClient in context. */
export const layer = (token: Redacted.Redacted) =>
	Layer.effect(
		GitHub,
		Effect.map(HttpClient.HttpClient, (client) => make(client, token))
	);
