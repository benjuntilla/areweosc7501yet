import { Array, Effect } from 'effect';

export const themes = ['auto', 'light', 'dark'] as const;
export type Theme = (typeof themes)[number];

/** The chosen theme. The sidebar and the phone menu each have a toggle, and both show this one. */
export const choice = $state<{ theme: Theme }>({ theme: 'auto' });

/** The saved theme, or auto when nothing valid is saved or storage is blocked. */
export const readTheme: Effect.Effect<Theme> = Effect.try(() => localStorage.getItem('theme')).pipe(
	Effect.map((saved) => Array.findFirst(themes, (t) => t === saved)),
	Effect.flatMap(Effect.fromOption),
	Effect.orElseSucceed((): Theme => 'auto')
);

/** Applies a theme to the page and saves it. app.html reads it back before the next first paint. */
export const applyTheme = (theme: Theme) =>
	Effect.gen(function* () {
		const root = document.documentElement;
		if (theme === 'auto') delete root.dataset['theme'];
		else root.dataset['theme'] = theme;
		yield* Effect.try(() => {
			if (theme === 'auto') localStorage.removeItem('theme');
			else localStorage.setItem('theme', theme);
		}).pipe(Effect.ignore);
	});
