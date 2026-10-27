# Are We OSC 7501 Yet?

Which terminals and programs support OSC 7501, the Program Status Protocol. Live at [areweosc7501yet.com](https://areweosc7501yet.com).

## Development

Run `mise install` with [mise](https://mise.jdx.dev) [activated](https://mise.jdx.dev/getting-started.html#activate-mise) in your shell. It installs the pinned tools, the dependencies, and the git hooks.

A commit formats and lints its staged files. A push runs CI's checks except the cf build. If the push changes `schema/` or `src/styles/tokens.css`, commit the new files and push again. jj doesn't run git hooks, so run `pnpm lefthook run pre-push --force` before `jj git push`.

Screenshots differ between machines, so only CI compares them. When the browser check fails, copy each `-actual.png` from `test-results/` in the run's `screenshots` artifact over its baseline in `browser/screenshots/`.

### Editor

`.zed/settings.json` sets up Zed with oxfmt, oxlint, and Tombi.

## Acknowledgements

- The seed data comes from [awesome-osc7501](https://github.com/hyeebeen/awesome-osc7501) by hyeebeen.
- The layout follows [Superlogical](https://www.superlogical.com)'s [Rex docs](https://www.superlogical.com/rex/docs), and other design motifs come from superlogical.com.
- The idea comes from the "Are we X yet?" sites: [Are we Wayland yet?](https://arewewaylandyet.com), [Are we anti-cheat yet?](https://areweanticheatyet.com), [Are we fast yet?](https://arewefastyet.com), [Are we web yet?](https://www.arewewebyet.org), [Are we GUI yet?](https://areweguiyet.com), [Are we game yet?](https://arewegameyet.rs), and [Are we learning yet?](https://www.arewelearningyet.com).

## License

Code is [MIT](LICENSE). Data is [CC0](data/LICENSE).
