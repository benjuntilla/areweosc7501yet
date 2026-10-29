import { Resvg } from '@resvg/resvg-js';
import favicon from '../../../static/favicon.svg?raw';

const png = (svg: string, size: number) =>
	new Response(
		new Uint8Array(new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()),
		{ headers: { 'content-type': 'image/png' } }
	);

/**
 * The favicon for browsers that can't show the SVG one. The renderer skips the SVG's dark-mode
 * rule, so the dots keep their light-mode color.
 */
export const faviconPng = () => png(favicon, 32);

/**
 * The icon iOS puts on the home screen. iOS rounds the corners and fills transparent pixels with
 * black, so the dots sit on white with a margin.
 */
export const appleTouchIconPng = () =>
	png(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
			<rect width="180" height="180" fill="#fff" />
			${favicon.replace('<svg', '<svg x="36" y="36" width="108" height="108"')}
		</svg>`,
		180
	);
