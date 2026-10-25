// Small, hand-written entries for unit tests. Real data lives in data/.

export const specToml = `
[[revision]]
number = "0.4"
date = 2026-10-10
url = "https://example.com/spec"
`;

export const kittyToml = `
name = "kitty"
url = "https://github.com/kovidgoyal/kitty"
repo = "kovidgoyal/kitty"
role = "terminal"
category = "emulators"
spec_revision = "0.4"
last_checked_date = 2026-10-24

[github]
stars = 35419
latest_release_tag = "v0.49.2"
latest_release_date = 2026-10-01

[[history]]
date = 2026-10-09
state = "idle"
source = "https://github.com/kovidgoyal/kitty/issues/10638"

[[history]]
date = 2026-10-12T08:00:00Z
state = "working"
source = "https://github.com/kovidgoyal/kitty/pull/10657"

[[history]]
date = 2026-10-13
state = "working"
source = "https://github.com/kovidgoyal/kitty/commit/0e1b7f4"
`;

export const rexToml = `
name = "Rex"
url = "https://www.superlogical.com/rex"
role = "terminal"
category = "multiplexers"
is_featured = true
spec_revision = "0.4"
last_checked_date = 2026-10-24

[[history]]
date = 2026-10-06
state = "done"
source = "https://www.superlogical.com/rex/docs/build/program-status"
`;

export const codexToml = `
name = "Codex"
url = "https://github.com/openai/codex"
repo = "openai/codex"
role = "program"
category = "coding-agents"
spec_revision = "0.4"
last_checked_date = 2026-10-24
github = { stars = 50000 }

[[history]]
date = 2026-10-09T01:00:00Z
state = "idle"
source = "https://github.com/openai/codex/issues/1"

[[history]]
date = 2026-10-09T05:00:00Z
state = "working"
source = "https://github.com/openai/codex/pull/2"

[[history]]
date = 2026-10-20T12:30:00+02:00
state = "done"
source = "https://github.com/openai/codex/releases/tag/rust-v0.50.0"
version = "rust-v0.50.0"
`;

export const smallToml = `
name = "tiny"
url = "https://github.com/someone/tiny"
repo = "someone/tiny"
role = "program"
category = "clis"
spec_revision = "0.4"
last_checked_date = 2026-10-24
history = []

[github]
stars = 12
`;

export const fixtureFiles = {
	'/data/entries/codex.toml': codexToml,
	'/data/entries/kitty.toml': kittyToml,
	'/data/entries/rex.toml': rexToml,
	'/data/entries/tiny.toml': smallToml
};
