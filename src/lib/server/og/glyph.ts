import { render } from 'svelte/server';
import Icon from '#lib/components/Icon.svelte';
import StateGlyph from '#lib/components/StateGlyph.svelte';
import { token } from './tokens.ts';

export interface Node {
	type: string;
	props: Record<string, unknown>;
}

const attrs = (source: string): Record<string, string> => {
	const entries: Array<[string, string]> = Array.from(
		source.matchAll(/([\w-]+)="([^"]*)"/gu),
		(m): [string, string] => [
			(m[1] ?? '').replaceAll(/-(\w)/gu, (_, c: string) => c.toUpperCase()),
			m[2] ?? ''
		]
	).filter(([name]) => name !== 'class' && name !== 'style');
	return Object.fromEntries(entries);
};

/**
 * A glyph component's markup as an inline SVG node, wrapped so satori fills currentColor
 * with `color`. It parses only the flat <svg><path/>…</svg> the glyph components render.
 */
const inline = (markup: string, color: string, opacityOf: (i: number) => number): Node => {
	const root = /<svg([^>]*)>/u.exec(markup)?.[1] ?? '';
	const children = Array.from(markup.matchAll(/<(path|rect)([^>]*)>/gu), (m, i) => ({
		type: m[1] ?? 'path',
		props: { ...attrs(m[2] ?? ''), opacity: opacityOf(i) }
	}));
	return {
		type: 'div',
		props: {
			style: { display: 'flex', color },
			children: { type: 'svg', props: { ...attrs(root), children } }
		}
	};
};

// StateGlyph's still frame lights the first three dots and ghosts the rest.
const ghost = Number(token('state-glyph-icon-opacity')) / 100;

export const stateGlyph = (state: 'done' | 'working', size: number): Node =>
	inline(
		render(StateGlyph, { props: { state, size, spin: false } }).body,
		token(`status-${state}`),
		(i) => (state === 'working' && i >= 3 ? ghost : 1)
	);

export const sideIcon = (name: 'program' | 'terminal', size: number): Node =>
	inline(render(Icon, { props: { name, size } }).body, token('content-icon'), () => 1);
