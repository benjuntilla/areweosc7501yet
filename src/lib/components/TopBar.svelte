<script lang="ts">
	import { cover } from '#lib/client/cover.svelte.ts';
	import { loadSearch, searchKeys } from '#lib/client/search.ts';
	import type { Side } from '#lib/domain/overview.ts';
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
	// The bar is in its own place, or it has slid in at the top of the window, or out above it.
	let slide: 'in' | 'out' | undefined = $state();
	let lastY = 0;

	// In its own place, the bar has scrolled off the window or the overview's content covers it.
	const outOfSight = () => {
		const { bottom } = bar.getBoundingClientRect();
		return bottom <= 0 || bottom > cover.edge;
	};

	// Once the bar is out of sight, any scroll up brings it back and the next scroll down takes it
	// away. At the very top of the page it is in its own place again.
	const onscroll = () => {
		// iOS bounces past the end of the page, and the bounce back is not a scroll up.
		const y = Math.min(scrollY, document.documentElement.scrollHeight - innerHeight);
		if (y <= 0) slide = undefined;
		else if (y < lastY && (slide !== undefined || outOfSight())) slide = 'in';
		else if (y > lastY && slide === 'in') slide = 'out';
		lastY = y;
	};
</script>

<svelte:window {onscroll} />

<header
	id="top-bar"
	class:stays={cover.stays !== undefined}
	style:--fade={cover.fade}
	data-slide={slide}
	bind:this={bar}
>
	<div class="top-bar">
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

	/* When the bar comes back, or holds keyboard focus, it is fixed to the top of the window above
	   the content, on a strip of the page's paper. Its place in the page stays empty. */
	header:is([data-slide], :has(:global(:focus-visible))) {
		position: static;
		block-size: 36px;
		opacity: 1;
	}

	header:is([data-slide], :has(:global(:focus-visible))) > .top-bar {
		position: fixed;
		inset: 0 0 auto;
		z-index: 1;
		padding: var(--layout-page-padding-top) var(--layout-page-padding-x);
		background: var(--page-background);
	}

	header[data-slide='out']:not(:has(:global(:focus-visible))) > .top-bar {
		translate: 0 -100%;
	}

	@media (prefers-reduced-motion: no-preference) {
		header[data-slide='in'] > .top-bar {
			animation: slide-in var(--motion-top-bar-slide-duration) var(--motion-ease-unfold);
		}

		header[data-slide='out'] > .top-bar {
			transition: translate var(--motion-top-bar-slide-duration) var(--motion-ease-unfold);
		}
	}

	@keyframes slide-in {
		from {
			translate: 0 -100%;
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
