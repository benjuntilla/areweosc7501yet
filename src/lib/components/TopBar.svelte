<script lang="ts">
	import { cover } from '#lib/client/cover.svelte.ts';
	import { loadSearch, searchKeys } from '#lib/client/search.ts';
	import type { Side } from '#lib/domain/overview.ts';
	import { Number as Num } from 'effect';
	import { flushSync } from 'svelte';
	import Icon from './Icon.svelte';
	import Logo from './Logo.svelte';
	import Nav from './Nav.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	interface Props {
		sides: ReadonlyArray<Side>;
		current?: string | undefined;
		onsearch: (trigger: HTMLElement) => void;
	}

	let { sides, current, onsearch }: Props = $props();

	let sheet: HTMLDialogElement | undefined = $state();
	let menuOpen = $state(false);

	// Invoker commands open and close the menu without JavaScript. These handlers do the same in
	// browsers without them (Safari before 26.2); the command then finds the menu already in that state.
	const openMenu = () => sheet?.showModal();
	const closeMenu = () => sheet?.close();

	let bar: HTMLElement;
	let strip: HTMLElement;
	// Out of its own place, the bar is pinned to the top of the window. Scrolled up to the anchor, all
	// of it shows. One strip's height further down, it has all gone up, and in between it moves with
	// the page.
	let pinned = $state(false);
	let anchor = $state(0);
	let height = $state(0);
	let shown = $state(0);
	let settling = $state(false);
	let settleFrom = $state(0);
	let goingUp = false;
	let lastY = 0;
	let lastEnd = 0;
	let lastPageHeight = 0;

	// In its own place, the bar has scrolled off the window or the overview's content covers it.
	const outOfSight = () => {
		const { bottom } = bar.getBoundingClientRect();
		return bottom <= 0 || bottom > cover.edge;
	};

	// Once the bar is out of sight, it moves with the page: each scroll up brings that much of it
	// down into the window, and each scroll down takes that much back up. At the very top of the page
	// it is in its own place again.
	const onscroll = () => {
		// iOS bounces past the end of the page, and the bounce back is not a scroll up. The end can be
		// up to a pixel short of this, as scrollHeight is a whole number.
		const pageHeight = document.documentElement.scrollHeight;
		const end = pageHeight - innerHeight - 1;
		const y = Math.min(scrollY, end);
		const up = lastY - y;
		// The browser moves the page by itself when the page grows or shrinks, and near the end when
		// a mobile toolbar hides or shows and the window grows or shrinks. Then the bar holds still.
		// Further up, the toolbar does not move the page, so the scroll is the finger's.
		const pushed =
			pageHeight !== lastPageHeight || (end !== lastEnd && y >= Math.min(end, lastEnd));
		// From 1,100 px the bar does not show at all.
		if (y <= 0 || bar.offsetHeight === 0) {
			pinned = false;
			settling = false;
		} else if (pushed) {
			anchor += y - lastY;
		} else if (up !== 0 && (pinned || (up > 0 && outOfSight()))) {
			if (!pinned) {
				// The strip has its full height only once the bar is pinned.
				flushSync(() => (pinned = true));
				anchor = lastY - strip.offsetHeight;
			}
			// The strip's height changes with the window's width.
			height = strip.offsetHeight;
			settling = false;
			goingUp = up > 0;
			// Past either end of its way, the bar holds still, so the anchor moves along with the page.
			anchor = Num.clamp(anchor, { minimum: y - height, maximum: y });
			shown = anchor + height - y;
		}
		lastY = y;
		lastEnd = end;
		lastPageHeight = pageHeight;
	};

	// When the page stops with the bar part way in, the bar finishes the way it was going.
	const onscrollend = () => {
		if (!pinned) return;
		settleFrom = shown;
		shown = goingUp ? height : 0;
		anchor = lastY + shown - height;
		settling = true;
	};
</script>

<svelte:window {onscroll} {onscrollend} />

<header
	id="top-bar"
	class:stays={cover.stays !== undefined}
	class:pinned
	class:settling
	style:--fade={cover.fade}
	style:--shown="{shown}px"
	style:--follow="{anchor}px {anchor + height}px"
	style:--settle-from="{settleFrom}px"
	bind:this={bar}
>
	<div class="top-bar" bind:this={strip}>
		<Logo size={36} />
		<span class="spacer"></span>
		<button
			class="button search-button"
			type="button"
			aria-label="Search"
			aria-haspopup="dialog"
			aria-keyshortcuts={searchKeys}
			onpointerenter={loadSearch}
			onfocus={loadSearch}
			onclick={(event) => onsearch(event.currentTarget)}
		>
			<Icon name="search" />
		</button>
		<button
			class="button"
			type="button"
			aria-label="Menu"
			aria-expanded={menuOpen}
			aria-haspopup="dialog"
			commandfor="menu"
			command="show-modal"
			onclick={openMenu}
		>
			<Icon name="menu" />
		</button>
	</div>
</header>

<dialog
	id="menu"
	class="sheet"
	bind:this={sheet}
	aria-label="Menu"
	ontoggle={(event) => (menuOpen = event.newState === 'open')}
>
	<div class="top-bar">
		<Logo size={36} onnavigate={closeMenu} />
		<span class="spacer"></span>
		<button
			class="button"
			type="button"
			aria-label="Close menu"
			commandfor="menu"
			command="close"
			onclick={closeMenu}
		>
			<Icon name="close" />
		</button>
	</div>
	<Nav {sides} {current} autofocus onnavigate={closeMenu} />
	<ThemeToggle />
</dialog>

<style>
	.top-bar {
		display: flex;
		gap: var(--top-bar-gap);
		align-items: center;
	}

	@media (width >= 1100px) {
		header {
			display: none;
		}
	}

	/* A link or focus that scrolls up brings the bar back, so what it scrolls to lands below it. */
	@media (width < 1100px) {
		:global(:root) {
			scroll-padding-block-start: calc(var(--layout-page-padding-top) * 2 + 36px);
		}
	}

	/* On the overview, the bar stays put and fades with the top. */
	.stays {
		position: sticky;
		inset-block-start: var(--layout-page-padding-top);
		opacity: var(--fade);
	}

	/* Out of its own place, or holding keyboard focus, the bar is fixed to the top of the window above
	   the content, on a strip of the page's paper. Its place in the page stays empty. */
	header:is(.pinned, :has(:global(:focus-visible))) {
		position: static;
		block-size: 36px;
		opacity: 1;
	}

	header:is(.pinned, :has(:global(:focus-visible))) > .top-bar {
		position: fixed;
		inset: 0 0 auto;
		z-index: 1;
		padding: var(--layout-page-padding-top) var(--layout-page-padding-x);
		background: var(--page-background);
	}

	/* It shows as far as the scrolls have brought it in, and keyboard focus shows all of it. */
	header.pinned:not(:has(:global(:focus-visible))) > .top-bar {
		translate: 0 calc(var(--shown) - 100%);
	}

	/* Where it can, the page's own scrolling moves the bar, so it keeps up with the finger on iOS,
	   which scrolls apart from scripts. Longhands, so the build keeps the duration at auto, which spans
	   the range. */
	@supports (animation-timeline: scroll()) and (animation-range: normal) {
		header.pinned:not(.settling, :has(:global(:focus-visible))) > .top-bar {
			animation-name: top-bar-follow;
			animation-timing-function: linear;
			animation-fill-mode: both;
			animation-timeline: scroll(root);
			animation-range: var(--follow);
		}
	}

	@keyframes top-bar-follow {
		from {
			translate: 0 0;
		}

		to {
			translate: 0 -100%;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		header.settling > .top-bar {
			animation: top-bar-settle var(--motion-top-bar-slide-duration) var(--motion-ease-unfold);
		}
	}

	@keyframes top-bar-settle {
		from {
			translate: 0 calc(var(--settle-from) - 100%);
		}
	}

	.spacer {
		flex: 1;
	}

	:global(html:not(.js)) .search-button {
		display: none;
	}

	/* A 36 px circle with a 44 px hit area. */
	.button {
		position: relative;
		display: grid;
		place-items: center;
		padding: var(--top-bar-button-padding);
		color: var(--top-bar-icon-strong);
		background: var(--top-bar-button-background);
		border-radius: var(--top-bar-button-radius);
		box-shadow:
			0 2px 2px -1px var(--top-bar-button-shadow),
			0 1px 1px -0.5px var(--top-bar-button-shadow),
			0 0 0 0.5px var(--top-bar-button-ring);
	}

	.button::before {
		position: absolute;
		inset: -4px;
		content: '';
	}

	.sheet {
		inline-size: 100%;
		max-inline-size: none;
		block-size: 100%;
		max-block-size: none;
		padding: var(--layout-page-padding-top) var(--layout-page-padding-x) var(--menu-padding-bottom);
		margin: 0;
		/* stylelint-disable-next-line property-layout-mappings -- overflow-block needs Safari 26 */
		overflow-y: auto;
		/* stylelint-disable-next-line plugin/use-baseline -- where it is missing, the page behind scrolls along with the menu */
		overscroll-behavior: contain;
		color: inherit;
		background: var(--page-background);
		border: 0;
	}

	.sheet[open] {
		display: flex;
		flex-direction: column;
		gap: var(--menu-gap);
	}

	.sheet :global(.item) {
		padding: var(--menu-item-padding-y) var(--menu-item-padding-x);
		font-size: var(--type-body-size);
		line-height: var(--type-body-line-height);
		border-radius: var(--menu-item-radius);
	}

	.sheet :global(.nav),
	.sheet :global(.nav > ul > li),
	.sheet :global(.item) {
		inline-size: 100%;
	}

	.sheet :global(.item[aria-current='page']) {
		background: var(--chip-background);
	}

	.sheet :global(.group) {
		padding: var(--menu-group-padding-top) 0 var(--menu-group-padding-bottom)
			var(--menu-item-padding-x);
	}
</style>
