# Are We OSC 7501 Yet?

Which terminals and programs support OSC 7501, the Program Status Protocol. Live at [areweosc7501yet.com](https://areweosc7501yet.com).

## Development

Run `mise install` with [mise](https://mise.jdx.dev) [activated](https://mise.jdx.dev/getting-started.html#activate-mise) in your shell. It installs Node, pnpm and the check tools pinned in `.config/mise.toml`, then the dependencies.

Installing dependencies also installs the git hooks in `.config/lefthook.yml`. A commit formats and lints its staged files, and a push runs CI's "Lint, check, test and build" job except `pnpm cf build`. jj doesn't run git hooks, so run `pnpm lefthook run pre-push --force` before `jj git push`.

The push first regenerates `schema/` from `src/lib/domain/schema.ts` and `src/styles/tokens.css` from `tokens/`, and fails if either changed. Commit the regenerated files and push again.

The browser check compares each page with its screenshot in `browser/screenshots/`. Screenshots differ between machines, so CI's are the baselines: when a change alters a page, the failed run uploads the new ones as the `screenshots` artifact.

### Weekly checker

Every Monday, `.github/workflows/checker.yml` updates the entries from GitHub and opens a PR with the changes. This runs it locally, rewriting `data/entries/` and writing the PR body to `/tmp/body.md`:

```sh
GITHUB_TOKEN=$(gh auth token) node scripts/checker/main.ts --body /tmp/body.md
```

### Editor

`.zed/settings.json` sets up Zed to format with oxfmt and lint with oxlint as CI does, and to check entry files against the schema with Tombi.

## Acknowledgements

- The seed data comes from [awesome-osc7501](https://github.com/hyeebeen/awesome-osc7501) by hyeebeen.
- The layout follows [Superlogical](https://www.superlogical.com)'s [Rex docs](https://www.superlogical.com/rex/docs), and other design motifs come from superlogical.com.
- The idea comes from the "Are we X yet?" sites: [Are we Wayland yet?](https://arewewaylandyet.com), [Are we anti-cheat yet?](https://areweanticheatyet.com), [Are we fast yet?](https://arewefastyet.com), [Are we web yet?](https://www.arewewebyet.org), [Are we GUI yet?](https://areweguiyet.com), [Are we game yet?](https://arewegameyet.rs) and [Are we learning yet?](https://www.arewelearningyet.com).

## License

Code is [MIT](LICENSE). Data is [CC0](data/LICENSE).
