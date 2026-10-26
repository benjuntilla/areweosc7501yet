<script lang="ts">
	import { forkScoped, prefersReducedMotion } from '#lib/client/fiber.ts';
	import type { State } from '#lib/domain/schema.ts';
	import { siteTitle } from '#lib/meta.ts';
	import { Effect } from 'effect';
	import { onMount } from 'svelte';
	import StateGlyph from './StateGlyph.svelte';

	let { size = 48 }: { size?: number } = $props();

	const cycle: ReadonlyArray<State> = ['error', 'idle', 'working', 'blocked', 'done'];
	let state: State = $state('working');

	onMount(() => {
		if (prefersReducedMotion()) return;
		const next = Effect.sync(() => {
			state = cycle[(cycle.indexOf(state) + 1) % cycle.length] ?? 'working';
		});
		return forkScoped(Effect.forever(Effect.delay(next, '1800 millis')));
	});
</script>

<a class="logo-tile" href="/" aria-label="{siteTitle} home" style:--size="{size}px">
	<StateGlyph {state} size={size / 2} />
</a>

<style>
	.logo-tile {
		display: grid;
		place-items: center;
		width: var(--size);
		height: var(--size);
		border-radius: calc(var(--size) / 4);
		background: var(--logo-tile-background);
		box-shadow:
			0 2px 1px var(--logo-tile-shadow),
			0 1px 0.5px var(--logo-tile-shadow),
			0 0 0 0.5px var(--logo-tile-ring);
	}
</style>
