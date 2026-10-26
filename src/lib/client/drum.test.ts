import { describe, expect, it } from '@effect/vitest';
import { flick, restingPosition, rows, wordAt } from './drum.ts';

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

	it('moves at least one word on a small flick', () => {
		expect(flick(4, 4.2)).toBe(5);
		expect(flick(4, 3.9)).toBe(3);
		expect(flick(4, 6.4)).toBe(6);
	});
});
