<script lang="ts">
	import type { Side } from '#lib/domain/overview.ts';
	import Logo from './Logo.svelte';
	import Nav from './Nav.svelte';
	import SearchPill from './SearchPill.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	interface Props {
		sides: ReadonlyArray<Side>;
		current?: string | undefined;
		onsearch: (trigger: HTMLElement) => void;
	}

	let { sides, current, onsearch }: Props = $props();
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
	}

	/* The sidebar scrolls when the window is short, so its parts keep their size. */
	.sidebar > :global(*) {
		flex-shrink: 0;
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
