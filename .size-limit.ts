import { globSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Each page's JavaScript is the modules it preloads.
export default globSync('build/**/*.html').map((page) => ({
	name: page,
	path: Array.from(
		readFileSync(page, 'utf8').matchAll(/<link href="([^"]+\.js)" rel="modulepreload">/gu),
		([, href = '']) => join(dirname(page), href)
	),
	gzip: true,
	limit: '35 kB'
}));
