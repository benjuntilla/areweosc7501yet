<!-- MOMENTIC SKILLS START (momentic) -->

## Momentic agent skills (`npx momentic skills`)

This project has Momentic agent skills installed in `.claude/skills/`. Before you write, run, or maintain Momentic browser, Android, or iOS tests, load the most relevant skill: `momentic-maintain`, `momentic-spec`, `momentic-test`.
<!-- MOMENTIC SKILLS END (momentic) -->

## Momentic environments

Momentic tests run against production by default, so a plain `pnpm exec momentic run` does not test the working tree. To validate a local change, run `pnpm build && pnpm preview`, then `pnpm exec momentic run --env local`.
