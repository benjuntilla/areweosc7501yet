# Are We OSC 7501 Yet?

Which terminals and programs support OSC 7501, the Program Status Protocol. Live at [areweosc7501yet.com](https://areweosc7501yet.com).

## Running it

Node 24 and pnpm 10, pinned in `package.json` (`devEngines`). pnpm runs the project's scripts on that Node and downloads it if needed. pnpm itself still needs Node 18.12 or newer to start.

```sh
pnpm install
pnpm dev            # dev server
pnpm lint           # oxlint, type-aware (options in oxlint.config.ts)
pnpm format         # oxfmt: TS, Svelte, CSS, JSON, TOML, Markdown
pnpm check          # svelte-check: types, template types, a11y
pnpm test           # unit tests
pnpm build          # static site in build/
```

CI runs `pnpm lint`, `pnpm format:check`, `pnpm check`, `pnpm test` and `pnpm build` on every PR.

## Editor

The repo is set up for Zed. `.zed/settings.json` installs the Oxc, Svelte and Tombi extensions, formats on save with oxfmt and lints with oxlint, both from `node_modules`, so the editor agrees with CI.

## License

Code is [MIT](LICENSE). Data is [CC0](data/LICENSE).
