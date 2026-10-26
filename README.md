# Are We OSC 7501 Yet?

Which terminals and programs support OSC 7501, the Program Status Protocol. Live at [areweosc7501yet.com](https://areweosc7501yet.com).

## Development

The Node and pnpm versions are pinned in `package.json` (`devEngines`). pnpm runs the project's scripts on that Node and downloads it if needed.

Installing dependencies also installs the git hooks in `lefthook.yml`. A commit formats and lints its staged files, and a push runs CI's checks except the build. jj doesn't run git hooks, so run `pnpm lefthook run pre-push --force` before `jj git push`.

### Editor

The repo is set up for Zed. `.zed/settings.json` installs the Oxc, Svelte and Tombi extensions, formats on save with oxfmt and lints with oxlint, both from `node_modules`, so the editor agrees with CI.

## Acknowledgements

- The seed data comes from [awesome-osc7501](https://github.com/hyeebeen/awesome-osc7501) by hyeebeen.
- The layout follows [Superlogical](https://www.superlogical.com)'s [Rex docs](https://www.superlogical.com/rex/docs), and the drum and rail follow superlogical.com.
- The idea comes from the "Are we X yet?" sites: [Are we Wayland yet?](https://arewewaylandyet.com), [Are we anti-cheat yet?](https://areweanticheatyet.com), [Are we fast yet?](https://arewefastyet.com), [Are we web yet?](https://www.arewewebyet.org), [Are we GUI yet?](https://areweguiyet.com), [Are we game yet?](https://arewegameyet.rs) and [Are we learning yet?](https://www.arewelearningyet.com).

## License

Code is [MIT](LICENSE). Data is [CC0](data/LICENSE).
