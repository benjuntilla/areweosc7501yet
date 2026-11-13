import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import type { RoleSummary } from '../../domain/derive.ts';
import type { Site } from '../../domain/site.ts';
import { type Node, sideIcon, stateGlyph } from './glyph.ts';
import { token } from './tokens.ts';
import { siteTitle } from '#lib/meta.ts';

// The meter's field ramp, lime end on the left as on the site. Satori blends stops in sRGB, and
// the ramp's ten stops keep that within a few levels of the site's OKLab blend.
const gradient = `linear-gradient(270deg, ${token('meter-field')})`;

// The card is drawn larger than any site breakpoint, so its sizes aren't tokens.
const meterWidth = 524;

type Style = Record<string, string | number>;

const div = (style: Style, ...children: ReadonlyArray<Node | string>): Node => ({
	type: 'div',
	props: { style: { display: 'flex', ...style }, children }
});

/** One run of the meter: the full-width gradient, clipped to [from, to) of the track. */
const segment = (from: number, to: number, opacity: number): Node =>
	div(
		{
			position: 'absolute',
			left: from * meterWidth,
			width: (to - from) * meterWidth,
			height: '100%',
			overflow: 'hidden',
			opacity
		},
		div({
			marginLeft: -from * meterWidth,
			width: meterWidth,
			flexShrink: 0,
			backgroundImage: gradient
		})
	);

const count = (icon: Node, text: string): Node =>
	div(
		{ alignItems: 'center', gap: 8.75 },
		icon,
		div({ fontSize: 21, lineHeight: '28px', color: token('meter-count') }, text)
	);

const verdict = (name: string, role: 'program' | 'terminal', word: string): Node =>
	div(
		{ flexDirection: 'column', gap: 5.4, height: 84 },
		div(
			{ alignItems: 'center', gap: 10.8 },
			sideIcon(role, 24.3),
			div(
				{ fontSize: 27, lineHeight: '35.1px', letterSpacing: -0.3, color: token('verdict-label') },
				`${name}:`
			)
		),
		div(
			{ fontSize: 37.8, lineHeight: '43.47px', letterSpacing: -0.56, color: token('verdict-word') },
			word
		)
	);

const meter = (v: RoleSummary): Node => {
	const doneEnd = v.featured === 0 ? 0 : v.done / v.featured;
	const workingEnd = v.featured === 0 ? 0 : (v.done + v.working) / v.featured;
	return div(
		{
			position: 'relative',
			width: meterWidth,
			height: 12,
			borderRadius: token('meter-radius'),
			overflow: 'hidden',
			backgroundColor: token('meter-track')
		},
		segment(0, doneEnd, 1),
		segment(doneEnd, workingEnd, Number(token('meter-ghost-opacity')) / 100)
	);
};

const column = (name: string, role: 'program' | 'terminal', v: RoleSummary): Node =>
	div(
		{ flexDirection: 'column', gap: 18, width: meterWidth },
		verdict(name, role, v.verdict),
		meter(v),
		div(
			{ gap: 36.75 },
			count(stateGlyph('done', 21), `${v.done} of ${v.featured} done`),
			count(stateGlyph('working', 21), `${v.working} working`)
		)
	);

const card = (site: Site): Node =>
	div(
		{
			position: 'relative',
			width: '100%',
			height: '100%',
			backgroundColor: token('page-background'),
			fontFamily: 'Inter'
		},
		div(
			{
				position: 'absolute',
				left: 60,
				top: 142,
				fontSize: 76,
				lineHeight: 1.05,
				letterSpacing: -1.9,
				color: token('heading-text')
			},
			siteTitle
		),
		div(
			{ position: 'absolute', left: 64, top: 284, gap: 24 },
			column('Programs', 'program', site.verdicts.program),
			column('Terminals', 'terminal', site.verdicts.terminal)
		)
	);

// The site loads variable Inter as woff2, which satori can't read, so the card uses static woff.
const inter = readFile(
	fileURLToPath(import.meta.resolve('@fontsource/inter/files/inter-latin-400-normal.woff'))
);

/** The 1200×630 share card for the current verdicts, as a PNG. */
export const renderOgImage = async (site: Site): Promise<Uint8Array<ArrayBuffer>> => {
	const svg = await satori(card(site), {
		width: 1200,
		height: 630,
		fonts: [{ name: 'Inter', data: await inter, weight: 400, style: 'normal' }]
	});
	return new Uint8Array(new Resvg(svg).render().asPng());
};
