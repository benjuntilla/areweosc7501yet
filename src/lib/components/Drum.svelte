<script lang="ts">
	import {
		autoTurn,
		dragSpeed,
		type Motion,
		release,
		restingPosition,
		rows,
		type Sample,
		turn,
		wheelSpeed,
		wordAt
	} from '#lib/client/drum.ts';
	import { forkScoped, prefersReducedMotion } from '#lib/client/fiber.ts';
	import { Effect } from 'effect';
	import { onMount } from 'svelte';

	const step = 360 / rows;
	const rowHeight = 26;

	let position = $state(restingPosition);
	let dragging = $state(false);
	let hovered = false;
	let lastInput = 0;
	let frame = 0;
	let drum: HTMLDivElement | undefined = $state();

	// The drum shows when it is on screen and the content that slides over the top hasn't covered it.
	const seen = () => {
		if (!drum) return false;
		const box = drum.getBoundingClientRect();
		return drum.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
	};

	// Reduced motion is read on every check, so changing the setting stops or resumes the turns.
	const held = () =>
		prefersReducedMotion() ||
		hovered ||
		dragging ||
		frame !== 0 ||
		document.hidden ||
		performance.now() - lastInput < 2000 ||
		!seen();

	const stop = () => {
		cancelAnimationFrame(frame);
		frame = 0;
	};

	// Moves the drum once a frame until the motion rests, then lines its row up exactly.
	const play = (motion: Motion) => {
		stop();
		let start: number | undefined;
		const tick = (now: number) => {
			start ??= now;
			const next = motion((now - start) / 1000);
			position = next ?? Math.round(position);
			frame = next === undefined ? 0 : requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
	};

	// A thrown drum coasts for about this long, in seconds. A drag throws farther than the wheel.
	const glide = { drag: 0.25, wheel: 0.09 };

	const settle = (speed: number, coast: number) => {
		lastInput = performance.now();
		if (prefersReducedMotion()) position = Math.round(position);
		else play(release(position, speed, coast));
	};

	onMount(() => {
		const stopTurning = forkScoped(
			autoTurn({ interval: 1500, held, turn: () => play(turn(position, 0.62)) })
		);
		return () => {
			stopTurning();
			stop();
		};
	});

	let samples: Array<Sample> = [];

	// Preventing the default keeps a drag from selecting text.
	const onpointerdown = (event: PointerEvent) => {
		if (!event.isPrimary || event.button !== 0) return;
		event.preventDefault();
		stop();
		dragging = true;
		samples = [{ time: event.timeStamp, y: event.clientY }];
		drum?.setPointerCapture(event.pointerId);
	};

	// The drum turns one row for each row height the pointer moves. The last 100 ms of moves tell
	// how fast it was going when let go.
	const onpointermove = (event: PointerEvent) => {
		const last = samples.at(-1);
		if (!dragging || last === undefined) return;
		position += (last.y - event.clientY) / rowHeight;
		samples = [...samples, { time: event.timeStamp, y: event.clientY }].filter(
			(s) => s.time >= event.timeStamp - 100
		);
	};

	// A pause before letting go puts the drum down instead of throwing it.
	const onpointerup = (event: PointerEvent) => {
		if (!dragging) return;
		dragging = false;
		const last = samples.at(-1);
		const thrown =
			event.type === 'pointerup' && last !== undefined && event.timeStamp - last.time <= 80;
		settle(thrown ? dragSpeed(samples, rowHeight) : 0, glide.drag);
	};

	let speed = 0;
	let lastWheel = 0;
	let cancelSettle = () => {};

	// The wheel turns the drum as far as it would scroll the page, and the drum coasts on once the
	// wheel stops.
	const onwheel = (event: WheelEvent) => {
		event.preventDefault();
		stop();
		const pixels =
			event.deltaMode === WheelEvent.DOM_DELTA_LINE
				? event.deltaY * rowHeight
				: event.deltaMode === WheelEvent.DOM_DELTA_PAGE
					? event.deltaY * innerHeight
					: event.deltaY;
		position += pixels / rowHeight;
		speed = wheelSpeed(speed, pixels / rowHeight, event.timeStamp - lastWheel);
		lastWheel = event.timeStamp;
		lastInput = performance.now();
		cancelSettle();
		cancelSettle = forkScoped(
			Effect.delay(
				Effect.sync(() => settle(speed, glide.wheel)),
				'55 millis'
			)
		);
	};

	$effect(() => {
		if (!drum) return;
		drum.addEventListener('wheel', onwheel, { passive: false });
		return () => drum?.removeEventListener('wheel', onwheel);
	});
</script>

<div
	class="drum"
	class:dragging
	bind:this={drum}
	aria-hidden="true"
	onpointerenter={() => (hovered = true)}
	onpointerleave={() => (hovered = false)}
	{onpointerdown}
	{onpointermove}
	{onpointerup}
	onpointercancel={onpointerup}
>
	<div class="ring" style:rotate="x {position * step}deg">
		{#each { length: rows } as _, row (row)}
			{@const offset =
				((((row - Math.round(position)) % rows) + rows + rows / 2) % rows) - rows / 2}
			{@const word = wordAt(row, position)}
			<span
				class="row"
				class:front={offset === 0}
				style:--row={row}
				style:--offset={offset}
				style:--word-color="var(--status-{word})">{word}.</span
			>
		{/each}
	</div>
</div>

<style>
	.drum {
		position: relative;
		inline-size: 84px;
		block-size: 98px;
		font-size: var(--type-drum-size);
		line-height: var(--type-drum-line-height);
		touch-action: none;
		cursor: grab;
		mask-image: linear-gradient(transparent, black 30%, black 70%, transparent);
		perspective: 350px;
	}

	.dragging {
		cursor: grabbing;
	}

	.ring {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
		translate: 0 0 -58.4px;
	}

	.row {
		position: absolute;
		inset-block-start: calc(50% - var(--type-drum-line-height) / 2);
		inset-inline-start: 0;
		color: var(--content-text-muted);
		white-space: nowrap;
		opacity: 0.55;
		transform: rotateX(calc(var(--row) * -1deg * 360 / 14)) translateZ(58.4px);
		backface-visibility: hidden;
	}

	.front {
		color: var(--word-color);
		opacity: 1;
	}

	@media (prefers-reduced-motion: no-preference) {
		:global(html.js) .row {
			animation: reveal var(--motion-drum-reveal-duration) var(--motion-ease-reveal) both;
			animation-delay: calc((var(--offset) + 3) * var(--motion-drum-reveal-stagger));
		}
	}

	@keyframes reveal {
		from {
			opacity: 0;
			translate: 0 8px;
		}
	}
</style>
