import { Effect, Fiber } from 'effect';

/** Runs an effect for as long as a component lives. Returns the cleanup that interrupts it. */
export const forkScoped = <A, E>(effect: Effect.Effect<A, E>) => {
	const fiber = Effect.runFork(effect);
	return () => {
		Effect.runFork(Fiber.interrupt(fiber));
	};
};

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
