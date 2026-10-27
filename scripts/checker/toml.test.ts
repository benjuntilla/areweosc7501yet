import { describe, expect, it } from '@effect/vitest';
import { tomlDate } from './toml.ts';

describe('tomlDate', () => {
	it('writes midnight UTC as a day, which reads back as the same instant', () => {
		expect(String(tomlDate('2026-10-13T00:00:00.000Z'))).toBe('2026-10-13');
	});

	it('writes any other instant as a UTC date-time', () => {
		expect(String(tomlDate('2026-10-13T03:58:18.000Z'))).toBe('2026-10-13T03:58:18Z');
	});

	it('keeps milliseconds', () => {
		expect(String(tomlDate('2026-10-13T03:58:18.120Z'))).toBe('2026-10-13T03:58:18.12Z');
	});
});
