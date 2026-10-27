import type { KnipConfig } from 'knip';

export default {
	entry: ['cloudflare.config.ts', 'terrazzo.config.ts'],
	ignoreExportsUsedInFile: true
} satisfies KnipConfig;
