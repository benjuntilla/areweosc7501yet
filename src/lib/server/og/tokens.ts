import { readFileSync } from 'node:fs';

// Read from disk because Vitest blanks CSS imports, ?raw included. The build runs from the
// project root. The first :root block holds the light theme at desktop size. Values that wrap
// across lines there come back on one line, which Satori needs.
const css = readFileSync('src/styles/tokens.css', 'utf8');
const light = new Map(
	Array.from(css.slice(0, css.indexOf('}')).matchAll(/--([\w-]+):\s*([^;]+);/gu), (m) => [
		m[1] ?? '',
		(m[2] ?? '').replaceAll(/\s+/gu, ' ')
	])
);

/** A light-theme token's value with every var() resolved. A missing token fails the build. */
export const token = (name: string): string => {
	const value = light.get(name);
	if (value === undefined) throw new Error(`tokens.css has no --${name}`);
	return value.replaceAll(/var\(--([\w-]+)\)/gu, (_, ref: string) => token(ref));
};
