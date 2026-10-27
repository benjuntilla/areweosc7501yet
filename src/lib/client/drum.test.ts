import { describe, expect, it } from '@effect/vitest';
import { type Motion, release, restingPosition, rows, wordAt } from './drum.ts';

/** Where a motion comes to rest, sampled at 60 frames a second. */
const restOf = (motion: Motion) => {
	let last = Number.NaN;
	for (let frame = 0; frame < 600; frame += 1) {
		const position = motion(frame / 60);
		if (position === undefined) return Math.round(last);
		last = position;
	}
	return last;
};

describe('drum', () => {
	it('rests on working', () => {
		expect(wordAt(restingPosition, restingPosition)).toBe('working');
	});

	it('reads the words in order around the front row', () => {
		const position = 32;
		const front = position % rows;
		const near = [-2, -1, 0, 1, 2].map((d) => wordAt((front + d + rows) % rows, position));
		expect(near).toEqual(['error', 'idle', 'working', 'blocked', 'done']);
	});

	it('coasts on to a later row when thrown', () => {
		expect(restOf(release(4.3, 20, 0.25))).toBe(9);
	});

	it('springs to the nearest row when put down', () => {
		expect(restOf(release(4.3, 0, 0.25))).toBe(4);
	});
});
