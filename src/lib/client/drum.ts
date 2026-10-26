import { Effect } from 'effect';

export const words = ['error', 'idle', 'working', 'blocked', 'done'] as const;
export type Word = (typeof words)[number];

/** Rows on the ring. Five words don't divide 14 rows, so rows relabel while they face away. */
export const rows = 14;

export const restingPosition = words.indexOf('working');

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * The word a row shows at a position. Each row takes the word of the nearest position at which
 * it faces front, so the rows near the front always read in order.
 */
export const wordAt = (row: number, position: number): Word => {
	const front = Math.round(position);
	const offset = mod(row - front + rows / 2, rows) - rows / 2;
	return words[mod(front + offset, words.length)] ?? 'working';
};

export const flick = (from: number, to: number) =>
	Math.round(to) === Math.round(from) ? Math.round(from) + Math.sign(to - from) : Math.round(to);

export const autoTurn = (options: {
	readonly interval: number;
	readonly held: () => boolean;
	readonly turn: () => void;
}) =>
	Effect.forever(
		Effect.delay(
			Effect.sync(() => {
				if (!options.held()) options.turn();
			}),
			`${options.interval} millis`
		)
	);
