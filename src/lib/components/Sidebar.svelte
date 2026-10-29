<script lang="ts">
	import { page } from '$app/state';
	import { sectionIds, spy } from '#lib/client/spy.ts';
	import type { Side } from '#lib/domain/overview.ts';
	import Logo from './Logo.svelte';
	import Nav from './Nav.svelte';
	import SearchPill from './SearchPill.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	interface Props {
		sides: ReadonlyArray<Side>;
		/** The section in view, from scroll-spy, for the nav here and in the phone menu. */
		current?: string | undefined;
		onsearch: (trigger: HTMLElement) => void;
	}

	let { sides, current = $bindable(), onsearch }: Props = $props();

	const ids = $derived(
		sectionIds(
			page.url.pathname,
			sides.flatMap((side) => [side.id].concat(side.categories.map((c) => c.id)))
		)
	);

	$effect(() =>
		spy(ids, (id) => {
			current = id;
		})
	);
</script>

<header class="sidebar">
	<Logo />
	<SearchPill {onsearch} />
	<Nav {sides} {current} />
	<ThemeToggle />
</header>

<style>
	/* The sidebar scrolls, and a scroll box clips what reaches past it. So it reaches past its content
	   by a focus ring's width and its 2 px offset, and the rings show in full. */
	.sidebar {
		--ring-room: calc(var(--focus-ring-stroke-width) + 2px);

		position: fixed;
		inset-block-start: var(--layout-page-padding-top);
		inset-inline-start: clamp(24px, 50% - 536px, 64px);
		box-sizing: content-box;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		inline-size: 200px;
		max-block-size: calc(100svb - var(--layout-page-padding-top) - var(--ring-room));
		padding: var(--ring-room);
		margin: calc(var(--ring-room) * -1);
		/* stylelint-disable-next-line property-layout-mappings -- overflow-block needs Safari 26 */
		overflow-y: auto;

		/* Focus scrolls clear of the fades below. */
		scroll-padding-block: calc(var(--sidebar-scroll-fade) + var(--ring-room));
		mask: linear-gradient(
			transparent,
			black var(--fade-start),
			black calc(100% - var(--fade-end)),
			transparent
		);
	}

	/* The sidebar scrolls when the window is short, so its parts keep their size. */
	.sidebar > :global(*) {
		flex-shrink: 0;
	}

	/* An edge that cuts off more to scroll fades out, so the sidebar reads as a scroll area. The
	   fades follow the scroll position, and a sidebar that fits has none. */
	@property --fade-start {
		syntax: '<length>';
		inherits: false;
		initial-value: 0;
	}

	@property --fade-end {
		syntax: '<length>';
		inherits: false;
		initial-value: 0;
	}

	@supports (animation-timeline: scroll()) and (animation-range: normal) {
		.sidebar {
			/* Longhands, so the build keeps the duration at auto, which spans each range. */
			animation-name: sidebar-fade-start, sidebar-fade-end;
			animation-timing-function: linear;
			animation-fill-mode: both;
			animation-timeline: scroll(self);
			animation-range:
				0 var(--sidebar-scroll-fade),
				calc(100% - var(--sidebar-scroll-fade)) 100%;
		}
	}

	@keyframes sidebar-fade-start {
		to {
			--fade-start: var(--sidebar-scroll-fade);
		}
	}

	@keyframes sidebar-fade-end {
		from {
			--fade-end: var(--sidebar-scroll-fade);
		}
	}

	.sidebar > :global(.search) {
		margin: var(--sidebar-search-margin-top) 0 var(--sidebar-search-margin-bottom);
	}

	.sidebar > :global(.theme-toggle) {
		margin: var(--sidebar-theme-toggle-margin-top) 0 var(--layout-page-padding-top);
	}

	@media (width < 1100px) {
		.sidebar {
			display: none;
		}
	}
</style>
