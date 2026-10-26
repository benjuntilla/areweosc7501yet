<script lang="ts">
	import { autoTurn, flick, restingPosition, rows, wordAt } from '#lib/client/drum.ts';
	import { forkScoped, prefersReducedMotion } from '#lib/client/fiber.ts';
	import { onMount } from 'svelte';

	const step = 360 / rows;
	const rowHeight = 26;

	let position = $state(restingPosition);
	let dragging = $state(false);
	let still = $state(true);
	let hovered = false;
	let visible = true;
	let lastInput = 0;
	let drum: HTMLDivElement | undefined = $state();

	const held = () =>
		hovered || dragging || !visible || document.hidden || performance.now() - lastInput < 2000;

	onMount(() => {
		if (!drum) return;
		const observer = new IntersectionObserver(([entry]) => {
			visible = entry?.isIntersecting ?? true;
		});
		observer.observe(drum);
		still = false;
		const stop = prefersReducedMotion()
			? () => {}
			: forkScoped(
					autoTurn({
						interval: 1500,
						held,
						turn: () => {
							position += 1;
						}
					})
				);
		return () => {
			observer.disconnect();
			stop();
		};
	});

	let dragStart = { y: 0, position: 0 };

	const onpointerdown = (event: PointerEvent) => {
		dragging = true;
		dragStart = { y: event.clientY, position };
		drum?.setPointerCapture(event.pointerId);
	};

	const onpointermove = (event: PointerEvent) => {
		if (!dragging) return;
		position = dragStart.position + (dragStart.y - event.clientY) / rowHeight;
	};

	const onpointerup = () => {
		if (!dragging) return;
		dragging = false;
		position = Math.round(position);
		lastInput = performance.now();
	};

	let wheelStart = restingPosition;
	let wheelTarget = restingPosition;
	let wheelTimer: ReturnType<typeof setTimeout> | undefined;

	const onwheel = (event: WheelEvent) => {
		event.preventDefault();
		if (wheelTimer === undefined) {
			wheelStart = position;
			wheelTarget = position;
		}
		wheelTarget += event.deltaY / 100;
		position = wheelTarget;
		lastInput = performance.now();
		clearTimeout(wheelTimer);
		wheelTimer = setTimeout(() => {
			position = flick(wheelStart, wheelTarget);
			wheelTimer = undefined;
		}, 120);
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
	class:still
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
		width: 84px;
		height: 98px;
		perspective: 350px;
		touch-action: none;
		user-select: none;
		cursor: grab;
		font-size: var(--type-drum-size);
		line-height: var(--type-drum-line-height);
		mask-image: linear-gradient(transparent, black 30%, black 70%, transparent);
	}

	.dragging {
		cursor: grabbing;
	}

	.ring {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
		translate: 0 0 -58.4px;
		transition: rotate var(--motion-drum-step-duration) var(--motion-ease-turn);
	}

	.dragging .ring,
	.still .ring {
		transition: none;
	}

	.row {
		position: absolute;
		top: calc(50% - var(--type-drum-line-height) / 2);
		left: 0;
		backface-visibility: hidden;
		transform: rotateX(calc(var(--row) * -1deg * 360 / 14)) translateZ(58.4px);
		white-space: nowrap;
	}

	.row {
		color: var(--content-text-muted);
		opacity: 0.55;
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

	@media (prefers-reduced-motion: reduce) {
		.ring {
			transition: none;
		}
	}
</style>
