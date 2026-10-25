# Are We OSC 7501 Yet?

Which terminals and programs support OSC 7501, the Program Status Protocol. Live at [areweosc7501yet.com](https://areweosc7501yet.com).

Each project is one TOML file in [`data/entries/`](data/entries). A weekly check refreshes stars and releases and opens a PR when a state changes. Spotted something out of date? Open an issue or a PR against its file.

## Running it

Node 24 and pnpm 10, pinned in `.node-version` and `packageManager`.

```sh
pnpm install
pnpm dev            # dev server; editing data/ hot-reloads
pnpm lint           # oxlint, type-aware (options in .oxlintrc.json)
pnpm format         # oxfmt: TS, Svelte, CSS, JSON, TOML, Markdown
pnpm check          # svelte-check: types, template types, a11y
pnpm test           # unit tests
pnpm build          # static site in build/
```

CI runs all of these on every PR.

## Editor

The repo is set up for Zed. `.zed/settings.json` installs the Oxc, Svelte and Tombi extensions, formats on save with oxfmt and lints with oxlint, both from `node_modules`, so the editor agrees with CI.

## How the code is laid out

- `src/lib/domain/`: the schema, loading and every derived value (states, verdicts, change rows, `data.json`), written with [Effect](https://effect.website). No SvelteKit imports, so tests and scripts use it directly.
- `src/lib/server/`: the one place that reads `data/` and caches the derived site for the build.
- `src/lib/components/`, `src/lib/client/`, `src/routes/`: plain Svelte and TypeScript. No Effect ships to the browser.
- `scripts/`: Node scripts, run with Effect's `NodeRuntime.runMain`.

## Contributing

- Every PR is squash-merged, so its title becomes the one commit on `main`. Write the title as a Conventional Commit: `type(scope): summary`, lowercase and imperative, with no trailing period. Types are feat, fix, perf, refactor, docs, test, build, ci, chore and revert. Scopes name the area, like data, schema, checker, overview, changes, rail, drum, popover, search, theme, feed, og or deps. CI checks the title.
- Commits on a PR branch can be work in progress, since they don't land on `main` one by one.
- No AI attribution anywhere: no co-author or sign-off trailers for AI tools, no "Generated with" lines and no session links, in commits, PR titles or PR bodies. CI rejects them in commits ([commit-check](https://github.com/commit-check/commit-check), configured in `cchk.toml`).
- Don't name internal milestones in titles, bodies or commits. They mean nothing to outside readers.
- CodeRabbit reviews every PR, and a PR merges only once it has no changes requested. Fix each finding or reply with why it doesn't apply.
- The repo is a colocated [jj](https://jj-vcs.github.io/jj/) repo, so jj and plain git both work.
- Big changes go up as a stack of PRs with [`gh stack`](https://github.com/github/gh-stack). Each layer has to build, lint and pass its tests on its own, and the stack merges bottom-up with `gh stack merge --squash`.

## License

Code is [MIT](LICENSE). Data is [CC0](data/LICENSE).
