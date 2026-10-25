# areweosc7501yet

A static SvelteKit site that tracks OSC 7501 (Program Status Protocol) support. Each project is one TOML file in `data/entries/`. The build decodes them, derives every state and verdict, and prerenders the pages plus `/data.json`.

## Commands

Node 24 and pnpm 10 (pinned in `.node-version` and `packageManager`).

```sh
pnpm dev            # dev server; editing data/ hot-reloads
pnpm lint           # oxlint
pnpm format         # oxfmt (TS, Svelte, CSS, JSON, TOML, Markdown)
pnpm check          # svelte-check: types, template types, a11y
pnpm test           # vitest unit tests
pnpm schema         # regenerate schema/*.json from the Effect Schemas
pnpm build          # vite build: build/ plus cf's .cloudflare/output
pnpm cf build       # what Workers Builds runs before cf deploy
```

CI runs all of these and fails if `schema/` is stale, so run `pnpm schema` after changing a schema.

## Layout and the Effect boundary

- `src/lib/domain/`: Effect. Schema, loading, derivations, data.json. No SvelteKit imports, so tests and scripts use it directly.
- `src/lib/server/`: the one place that reads `data/` (through `import.meta.glob`) and caches the derived site.
- `src/lib/components/`, `src/lib/client/`, `src/routes/`: plain Svelte and TypeScript. No Effect ships to the browser.
- `scripts/`: Node scripts run with `NodeRuntime.runMain`.
- `data/entries/*.toml`: no comments, since the weekly checker rewrites these files. Caveats go in `note`. An empty `history` means idle.

## Deploy

Cloudflare Workers static assets, deployed with `cf` (pinned exactly, it's in beta). `cloudflare.config.ts` is the Worker config.

`scripts/cloudflare-adapter.ts` wraps adapter-static and writes cf's Build Output (`.cloudflare/output/v0`) from `build/`. It exists because cf 1.0.0-beta.21 runs the SvelteKit build but doesn't write that output itself. Remove it, and switch back to plain adapter-static, once cf supports SvelteKit.

## Version control

Use jj; the repo is colocated with git.

```sh
jj new main                      # start work on a fresh change
jj describe -m "feat(rail): …"   # name the change
jj new                           # start the next one
jj squash --into <change>        # fold a fix into the commit it fixes
jj absorb                        # or let jj pick the commits
jj git push --bookmark <name>    # push; force-pushing your own branch is fine
```

Commits:

- Conventional Commits, `type(scope): summary`. Types: feat, fix, perf, refactor, docs, test, build, ci, chore, revert. Scopes name the area: data, schema, checker, overview, changes, rail, drum, popover, search, theme, feed, og, deps.
- Summary lowercase and imperative, no trailing period.
- One logical change per commit. Review fixes get folded into the commit they fix, never added as "address review" commits.
- No AI attribution: no Co-Authored-By trailer, no session links, no "Generated with" lines in commits or PR bodies. CI rejects them.
- PRs merge by rebase only, so commits land on `main` as written.
