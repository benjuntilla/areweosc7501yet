import { describe, expect, it } from '@effect/vitest';
import { isRealDate } from './schema.ts';

describe('isRealDate', () => {
	it.each([
		['2024-02-29', true],
		['2026-02-28', true],
		['2026-02-30', false],
		['2025-02-29', false],
		['1900-02-29', false],
		['2000-02-29', true],
		['2026-04-31', false],
		['2026-13-01', false],
		['2026-00-10', false],
		['2026-10-00', false],
		['2026-10-12T23:59:59Z', true],
		['2026-10-12T08:00:00.123+05:30', true],
		['2100-02-29', false],
		['2026-10-12T24:00:00Z', false],
		['2026-10-12T23:60:00Z', false],
		['2026-10-12T25:00:00Z', false],
		['2026-10-12T08:60:00Z', false],
		['2026-10-12T08:00:60Z', false],
		['2026-10-12T08:00:00+24:00', false],
		['2026-10-12T08:00:00+05:60', false],
		['2026-10-12T08:00:00', false]
	])('%s is %s', (s, ok) => expect(isRealDate(s)).toBe(ok));
});
