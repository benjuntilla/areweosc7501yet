import { Effect } from 'effect';
import { codeToHtml, type ThemeRegistration } from 'shiki';

// Colors are the code tokens, so the highlighting follows the theme with no highlighter in the browser.
const theme: ThemeRegistration = {
	name: 'site',
	type: 'light',
	colors: {
		'editor.foreground': 'var(--content-text-strong)',
		'editor.background': 'transparent'
	},
	tokenColors: [
		{ scope: 'comment', settings: { foreground: 'var(--code-block-comment)' } },
		{
			scope: [
				'entity.name.command',
				'constant.other.option',
				'meta.group.toml',
				'meta.group.double.toml'
			],
			settings: { foreground: 'var(--code-block-function)' }
		},
		{ scope: 'string.quoted.double.toml', settings: { foreground: 'var(--code-block-string)' } }
	]
};

/** The snippet as highlighted HTML, a `<pre>` with inline colors. */
export const highlight = (code: string, lang: 'toml' | 'shellscript') =>
	Effect.promise(() => codeToHtml(code, { lang, theme }));
