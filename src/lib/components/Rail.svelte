<script lang="ts">
	import { page } from '$app/state';
	import type { Side } from '#lib/domain/overview.ts';
	import Icon from './Icon.svelte';
	import StateGlyph from './StateGlyph.svelte';

	let { sides }: { sides: ReadonlyArray<Side> } = $props();

	// A side's label shows once its verdict has scrolled past the top of the window. Pages
	// without verdicts show both labels.
	let past: Record<string, boolean> = $state({});

	$effect(() => {
		if (page.url.pathname !== '/') {
			past = Object.fromEntries(sides.map((s) => [s.id, true]));
			return;
		}
		past = {};
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				const id = entry.target.id.replace('verdict-', '');
				past[id] = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
			}
		});
		for (const side of sides) {
			const verdict = document.querySelector(`#verdict-${side.id}`);
			if (verdict) observer.observe(verdict);
		}
		return () => observer.disconnect();
	});

	const pct = (side: Side, n: number) => (n / side.featured) * 100;
</script>

<aside class="rail" aria-label="Adoption">
	{#each sides as side (side.id)}
		<a
			class="segment"
			href="/#{side.id}"
			aria-label="{side.name}: {side.done} of {side.featured} done, jump to list"
			style:--done="{pct(side, side.done)}%"
			style:--working="{pct(side, side.working)}%"
		>
			<span class="label type-caption" class:shown={past[side.id] === true} aria-hidden="true">
				<span class="line name" style:--i="0"><Icon name={side.role} size={12} />{side.name}</span>
				<span class="line" style:--i="1"
					><StateGlyph state="done" size={12} />{side.done} of {side.featured} done</span
				>
				<span class="line" style:--i="2"
					><StateGlyph state="working" size={12} />{side.working} working</span
				>
			</span>
			<span class="bar">
				<span class="field ghost"></span>
				<span class="field done"></span>
			</span>
		</a>
	{/each}
</aside>

<style>
	.rail {
		position: fixed;
		inset: 12px 12px 12px auto;
		width: clamp(80px, 50% - 460px, 480px);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	@media (width < 1100px) {
		.rail {
			display: none;
		}
	}

	.segment {
		position: relative;
		flex: 1;
		display: block;
		border-radius: var(--rail-segment-radius);
		text-decoration: none;
	}

	.segment:focus-visible {
		outline-offset: 0;
	}

	.bar {
		position: absolute;
		inset: 0;
		overflow: hidden;
		border-radius: inherit;
		background: var(--rail-track);
	}

	.bar::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--rail-link-hover-overlay);
		opacity: 0;
		transition: opacity var(--motion-state-duration) var(--motion-ease-state);
	}

	.segment:hover .bar::after {
		opacity: calc(var(--rail-link-hover-opacity) / 100);
	}

	/* Grey fractal noise blended soft-light, so the grain doesn't shift the gradient's colors. */
	.field {
		position: absolute;
		inset: 0;
		background:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E"),
			linear-gradient(
				in oklab 180deg,
				var(--gradient-lavender) 0%,
				var(--gradient-pink) 30%,
				var(--gradient-orange) 50%,
				var(--gradient-amber) 72%,
				var(--gradient-lime) 100%
			);
		background-blend-mode: soft-light, normal;
	}

	.done {
		clip-path: inset(calc(100% - var(--done)) 0 0 0);
	}

	.ghost {
		opacity: calc(var(--rail-ghost-opacity) / 100);
		clip-path: inset(calc(100% - var(--done) - var(--working)) 0 var(--done) 0);
	}

	@media (prefers-reduced-motion: no-preference) {
		@supports (animation-timeline: scroll()) {
			.bar {
				animation: rail-hue linear both;
				animation-timeline: scroll(root);
			}
		}
	}

	@keyframes rail-hue {
		to {
			filter: hue-rotate(calc(var(--motion-rail-hue-max) * 1deg));
		}
	}

	.label {
		position: absolute;
		top: 0;
		right: calc(100% + 12px);
		display: flex;
		flex-direction: column;
		white-space: nowrap;
		pointer-events: none;
	}

	.label.shown {
		pointer-events: auto;
	}

	.line {
		display: flex;
		align-items: center;
		gap: var(--rail-label-gap);
		color: var(--rail-label-count);
		opacity: 0;
		translate: 0 var(--motion-rail-label-distance);
		transition:
			opacity var(--motion-rail-label-exit-duration) ease-out,
			translate var(--motion-rail-label-exit-duration) ease-in;
	}

	.shown .line {
		opacity: 1;
		translate: 0 0;
		transition:
			opacity var(--motion-rail-label-duration) var(--motion-ease-reveal),
			translate var(--motion-rail-label-duration) var(--motion-ease-reveal);
		transition-delay: calc(var(--i) * var(--motion-rail-label-stagger));
	}

	@media (prefers-reduced-motion: reduce) {
		.line,
		.shown .line {
			translate: 0 0;
			transition: opacity var(--motion-state-duration) ease-out;
			transition-delay: 0s;
		}
	}

	.name {
		color: var(--rail-label-name);
	}

	.name :global(svg) {
		color: var(--content-icon-strong);
	}

	.segment:hover .name {
		text-decoration: underline;
		text-underline-position: from-font;
	}
</style>
