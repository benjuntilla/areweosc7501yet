# Are We OSC 7501 Yet?

Which terminals and programs support OSC 7501, the Program Status Protocol. Live at [areweosc7501yet.com](https://areweosc7501yet.com).

## Development

The Node and pnpm versions are pinned in `package.json` (`devEngines`). pnpm runs the project's scripts on that Node and downloads it if needed.

Installing dependencies also installs the git hooks in `lefthook.yml`. A commit formats and lints its staged files, and a push runs CI's checks except the build. jj doesn't run git hooks, so run `pnpm lefthook run pre-push --force` before `jj git push`.

### Editor

`.zed/settings.json` sets up Zed to format and lint exactly as CI does.

## Deploying

Cloudflare Workers static assets, deployed with `cf` (pinned exactly, since it's in beta). `cloudflare.config.ts` is the Worker config.

```sh
pnpm cf deploy                  # build and deploy to production
pnpm cf previews deploy <name>  # build and deploy a preview named <name>
```

`cloudflare.adapter.ts` wraps adapter-static and writes cf's Build Output (`.cloudflare/output/v0`) from `build/`. It exists because cf 1.0.0-beta.21 runs the SvelteKit build but doesn't write that output itself. Remove it, and go back to plain adapter-static, once cf supports SvelteKit.

## Acknowledgements

- The seed data comes from [awesome-osc7501](https://github.com/hyeebeen/awesome-osc7501) by hyeebeen.
- The layout follows [Superlogical](https://www.superlogical.com)'s [Rex docs](https://www.superlogical.com/rex/docs), and other design motifs come from superlogical.com.
- The idea comes from the "Are we X yet?" sites: [Are we Wayland yet?](https://arewewaylandyet.com), [Are we anti-cheat yet?](https://areweanticheatyet.com), [Are we fast yet?](https://arewefastyet.com), [Are we web yet?](https://www.arewewebyet.org), [Are we GUI yet?](https://areweguiyet.com), [Are we game yet?](https://arewegameyet.rs) and [Are we learning yet?](https://www.arewelearningyet.com).

## License

Code is [MIT](LICENSE). Data is [CC0](data/LICENSE).
