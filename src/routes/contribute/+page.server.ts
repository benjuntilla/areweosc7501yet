import { highlight } from '#lib/server/highlight.ts';
import { Effect } from 'effect';
import kitty from '$data/entries/kitty.toml?raw';

export const load = () =>
	Effect.runPromise(highlight(kitty, 'toml').pipe(Effect.map((html) => ({ kitty, html }))));
