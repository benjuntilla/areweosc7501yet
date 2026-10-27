import { cubicOut } from 'svelte/easing';
import { Effect, Number } from 'effect';

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

/**
 * A motion: the position `t` seconds after it starts, or undefined once it rests on a row.
 * The drum's position counts rows, so a whole number faces front.
 */
export type Motion = (t: number) => number | undefined;

/** One automatic turn to the next row. */
export const turn =
	(from: number, seconds: number): Motion =>
	(t) =>
		t < seconds ? from + cubicOut(t / seconds) : undefined;

// Rows per second. A slower release puts the drum down instead of throwing it.
const throwSpeed = 0.75;
const maxSpeed = 48;
// Per second: how quickly a drum that was put down springs to its row.
const snapRate = 22;

/**
 * The drum after a release at `speed` rows per second. A throw coasts about `speed * glide` rows
 * and eases into the nearest row there, keeping its speed at first. A slower release springs to
 * the nearest row. Both are a critically damped spring, which never swings back and forth.
 */
export const release = (position: number, speed: number, glide: number): Motion => {
	const thrown = Math.abs(speed) >= throwSpeed;
	const row = Math.round(thrown ? position + speed * glide : position);
	const away = position - row;
	const towardRow = Math.sign(-away) === Math.sign(speed) && Math.abs(away) > 0.01;
	const rate = thrown && towardRow ? Math.abs(speed / away) : snapRate;
	const drift = speed + rate * away;
	return (t) => {
		const decay = Math.exp(-rate * t);
		const offset = (away + drift * t) * decay;
		const velocity = (drift - rate * (away + drift * t)) * decay;
		return Math.abs(offset) < 0.001 && Math.abs(velocity) < 0.01 ? undefined : row + offset;
	};
};

export interface Sample {
	readonly time: number;
	readonly y: number;
}

/** A drag's speed in rows per second over its last 100 ms, from pointer samples oldest first. */
export const dragSpeed = (samples: ReadonlyArray<Sample>, rowHeight: number) => {
	const last = samples.at(-1);
	const first = samples.find((s) => last !== undefined && s.time >= last.time - 100);
	if (last === undefined || first === undefined || first === last) return 0;
	const seconds = Math.max((last.time - first.time) / 1000, 0.016);
	const speed = (first.y - last.y) / rowHeight / seconds;
	return Number.clamp(speed, { minimum: -maxSpeed, maximum: maxSpeed });
};

/**
 * The wheel's speed in rows per second after an event that moved it `moved` rows, `gap` ms after
 * the one before. A wheel that rested or turned back starts over; otherwise the speed blends in.
 */
export const wheelSpeed = (before: number, moved: number, gap: number) => {
	const seconds = Number.clamp(gap, { minimum: 8, maximum: 80 }) / 1000;
	const speed = Number.clamp(moved / seconds, { minimum: -8, maximum: 8 });
	return gap > 120 || Math.sign(speed) !== Math.sign(before) ? speed : before * 0.55 + speed * 0.45;
};

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
