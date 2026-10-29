<div align="center">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset=".github/logo-dark.svg">
		<img src=".github/logo-light.svg" alt="" width="112">
	</picture>
	<h1>Are we OSC 7501 yet?</h1>
	<p>
		<i>Which terminals and programs support OSC 7501, the <a href="https://www.superlogical.com/rex/docs/build/program-status">Program Status Protocol</a>.</i>
	</p>
	<p>
		<a href="https://areweosc7501yet.com/#programs"><img alt="Programs" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fareweosc7501yet.com%2Fdata.json&query=%24.verdicts.program.word&label=programs&color=c33700&style=flat-square"></a>
		<a href="https://areweosc7501yet.com/#terminals"><img alt="Terminals" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fareweosc7501yet.com%2Fdata.json&query=%24.verdicts.terminal.word&label=terminals&color=c33700&style=flat-square"></a>
		<a href="LICENSE"><img alt="Code: MIT" src="https://img.shields.io/badge/code-MIT-873ac2?style=flat-square"></a>
		<a href="data/LICENSE"><img alt="Data: CC0" src="https://img.shields.io/badge/data-CC0-873ac2?style=flat-square"></a>
	</p>
	<br>
	<p>
		<b>
			<a href="https://areweosc7501yet.com">Website</a>
			&nbsp;·&nbsp;
			<a href="https://areweosc7501yet.com/methodology">Methodology</a>
			&nbsp;·&nbsp;
			<a href="https://areweosc7501yet.com/contribute">Contribute</a>
			&nbsp;·&nbsp;
			<a href="https://areweosc7501yet.com/data.json">Data as JSON</a>
		</b>
	</p>
</div>

## Development

Run `mise install` with [mise](https://mise.jdx.dev) [activated](https://mise.jdx.dev/getting-started.html#activate-mise) in your shell. It installs the pinned tools, the dependencies, and the git hooks.

A commit formats and lints its staged files. A push runs CI's checks except the cf build. If the push changes `schema/` or `src/styles/tokens.css`, commit the new files and push again. jj doesn't run git hooks, so run `pnpm lefthook run pre-push --force` before `jj git push`.

Screenshots only match when the browser runs in Playwright's Docker image, as it does in CI, so other runs skip them. When a page changes, run `pnpm screenshots` with Docker running and commit the screenshots that change. Without Docker, take them from the `screenshots` artifact of the failed CI run.

### Editor

`.zed/settings.json` sets up Zed with oxfmt, oxlint, and Tombi.

## Acknowledgements

- The seed data comes from [awesome-osc7501](https://github.com/hyeebeen/awesome-osc7501) by hyeebeen.
- The layout follows [Superlogical](https://www.superlogical.com)'s [Rex docs](https://www.superlogical.com/rex/docs), and other design motifs come from superlogical.com.
- The idea comes from the "Are we X yet?" sites: [Are we Wayland yet?](https://arewewaylandyet.com), [Are we anti-cheat yet?](https://areweanticheatyet.com), [Are we fast yet?](https://arewefastyet.com), [Are we web yet?](https://www.arewewebyet.org), [Are we GUI yet?](https://areweguiyet.com), [Are we game yet?](https://arewegameyet.rs), and [Are we learning yet?](https://www.arewelearningyet.com).
