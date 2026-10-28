<script lang="ts">
	import { page } from '$app/state';
	import { choice } from '#lib/client/theme.svelte.ts';
	import type { Side } from '#lib/domain/overview.ts';
	import { MediaQuery } from 'svelte/reactivity';
	import Icon from './Icon.svelte';
	import StateGlyph from './StateGlyph.svelte';

	let { sides }: { sides: ReadonlyArray<Side> } = $props();

	// A side's label shows once its verdict has scrolled past the top of the window. Pages
	// without verdicts show both labels from the start.
	const overview = $derived(page.url.pathname === '/');
	let past: Record<string, boolean> = $state({});

	$effect(() => {
		if (!overview) return;
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

	// Noise bends the field's bands into slow waves. It moves each point up or down by up to half
	// the warp scale, so the field reaches that far past the bar. The noise repeats every tile, and
	// the waves drift one tile per loop.
	const warp = 150;
	const tile = 600;

	// Safari runs a live SVG filter again on every frame of a view transition, so the search
	// dialog's morph stuttered over the rail. Instead, the filter warps the field's background once
	// into an image the field's size, drawn again when the field resizes or the theme changes. The
	// live filter shows until the first image is ready. Both bars are the same size, so their fields
	// share the image.
	const dark = new MediaQuery('prefers-color-scheme: dark');
	let filter: SVGFilterElement;
	let image: string | undefined = $state();

	const draw = (field: HTMLElement) => {
		const style = getComputedStyle(field);
		const background = ['image', 'position', 'size', 'repeat', 'color']
			.map((part) => `background-${part}: ${style.getPropertyValue(`background-${part}`)}`)
			.join('; ');
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${field.offsetWidth}" height="${field.offsetHeight}">${filter.outerHTML}<foreignObject width="100%" height="100%" filter="url(#${filter.id})"><div xmlns="http://www.w3.org/1999/xhtml" style="height: 100%; ${background}"/></foreignObject></svg>`;
		image = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
	};

	const warpOnce = (field: HTMLElement) => {
		// The theme sets the field's colors.
		void [choice.theme, dark.current];
		const observer = new ResizeObserver(() => draw(field));
		observer.observe(field);
		return () => observer.disconnect();
	};
</script>

<aside
	class="rail"
	class:drawn={image !== undefined}
	aria-label="Adoption"
	style:--warp-reach="{warp / 2}px"
	style:--tile="{tile}px"
	style:--field-image={image}
>
	<svg class="defs" aria-hidden="true">
		<filter
			bind:this={filter}
			id="rail-warp"
			x="0"
			y="0"
			width="1"
			height="1"
			color-interpolation-filters="sRGB"
		>
			<!-- Noise cells about as big as a bar. -->
			<feTurbulence
				type="fractalNoise"
				baseFrequency="0.0026"
				numOctaves="2"
				seed="7"
				stitchTiles="stitch"
				width={tile}
			/>
			<feTile />
			<!-- Red holds at 0.5, so points move up and down only. -->
			<feColorMatrix values="0 0 0 0 0.5  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1" />
			<feDisplacementMap
				in="SourceGraphic"
				scale={warp}
				xChannelSelector="R"
				yChannelSelector="G"
			/>
		</filter>
	</svg>
	{#each sides as side (side.id)}
		<a
			class="segment"
			href="/#{side.id}"
			aria-label="{side.name}: {side.done} of {side.featured} done, {side.working} working, jump to list"
			style:--done="{pct(side, side.done)}%"
			style:--working="{pct(side, side.working)}%"
		>
			<span
				class="label type-caption"
				class:shown={!overview || past[side.id] === true}
				aria-hidden="true"
			>
				<span class="line name" style:--i="0"><Icon name={side.role} size={12} />{side.name}</span>
				<span class="line" style:--i="1"
					><StateGlyph state="done" size={12} />{side.done} of {side.featured} done</span
				>
				<span class="line" style:--i="2"
					><StateGlyph state="working" size={12} />{side.working} working</span
				>
			</span>
			<span class="bar">
				<span class="fill"><span class="field" {@attach warpOnce}></span></span>
			</span>
		</a>
	{/each}
</aside>

<style>
	.rail {
		position: fixed;
		inset: 12px 12px 12px auto;
		display: flex;
		flex-direction: column;
		gap: var(--rail-gap);
		inline-size: clamp(80px, 50% - 460px, 480px);
	}

	@media (width < 1100px) {
		.rail {
			display: none;
		}
	}

	.segment {
		position: relative;
		display: block;
		flex: 1;
		text-decoration: none;
		border-radius: var(--rail-segment-radius);
	}

	.segment:focus-visible {
		outline-offset: 0;
	}

	.defs {
		position: absolute;
		inline-size: 0;
		block-size: 0;
	}

	.segment::after {
		position: absolute;
		inset: 0;
		pointer-events: none;
		content: '';
		border-radius: inherit;
		box-shadow: var(--rail-ring);
	}

	.bar {
		position: absolute;
		inset: 0;
		container-type: size;
		overflow: hidden;
		background: var(--rail-track);
		border-radius: inherit;
	}

	.bar::after {
		position: absolute;
		inset: 0;
		content: '';
		background: var(--rail-link-hover-overlay);
		opacity: 0;
		transition: opacity var(--motion-state-duration) var(--motion-ease-state);
	}

	.segment:hover .bar::after {
		opacity: calc(var(--rail-link-hover-opacity) / 100);
	}

	/* Done shows the field in full; working above it shows the field faintly. */
	.fill {
		position: absolute;
		inset: 0;
		mask: linear-gradient(
			to top,
			black var(--done),
			color-mix(in srgb, black calc(var(--rail-ghost-opacity) * 1%), transparent) 0
				calc(var(--done) + var(--working)),
			transparent 0
		);
	}

	/* White noise, blended overlay, so the grain lightens and darkens without shifting hue. */
	.fill::after {
		position: absolute;
		inset: 0;
		content: '';
		background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n' x='0' y='0' width='100%25' height='100%25' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 1.48 0 0 -0.24  0 1.48 0 0 -0.24  0 1.48 0 0 -0.24  0 0 0 0 1'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
		mix-blend-mode: overlay;
		opacity: calc(var(--rail-grain-opacity) / 100);
	}

	/* One grain dot per screen pixel. */
	@media (resolution >= 2x) {
		.fill::after {
			background-size: 100px;
		}
	}

	/* The ramp is twice the bar's height. Scrolling the page slides the field up, from the ramp's
	   first half at the top of the page to its second half at the bottom. Past its ends, the end
	   colors carry on. */
	.field {
		position: absolute;
		inset-block-start: calc(var(--warp-reach) * -1);
		inset-inline-start: 0;
		inline-size: calc(100% + var(--tile));
		block-size: calc(200cqb + var(--warp-reach) * 2);
		background:
			linear-gradient(in oklab 180deg, var(--rail-field)) 0 var(--warp-reach) / 100% 200cqb
				no-repeat,
			linear-gradient(var(--rail-field-end) 0 0) bottom / 100% 50% no-repeat,
			var(--rail-field-start);
		filter: url('#rail-warp');
	}

	.drawn .field {
		filter: none;
	}

	.drawn .field::before {
		position: absolute;
		inset: 0;
		content: '';
		background: var(--field-image);
	}

	@media (prefers-reduced-motion: no-preference) {
		.field {
			animation: rail-drift var(--motion-rail-drift-duration) linear infinite;
		}

		@supports (animation-timeline: scroll()) {
			.field {
				animation:
					rail-travel linear both,
					rail-drift var(--motion-rail-drift-duration) linear infinite;
				animation-timeline: scroll(root), auto;
			}
		}
	}

	/* The travel moves transform and the drift moves translate, so the two add up. */
	@keyframes rail-travel {
		to {
			transform: translateY(-100cqb);
		}
	}

	@keyframes rail-drift {
		to {
			translate: calc(var(--tile) * -1) 0;
		}
	}

	.label {
		position: absolute;
		inset-block-start: 0;
		inset-inline-end: calc(100% + 12px);
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
		gap: var(--rail-label-gap);
		align-items: center;
		color: var(--rail-label-count);
		opacity: 0;
		translate: 0 var(--motion-rail-label-distance);
		transition: var(--transition-lift-out);
	}

	.shown .line {
		opacity: 1;
		translate: 0 0;
		transition: var(--transition-lift-in);
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
		text-underline-position: under;
	}
</style>
