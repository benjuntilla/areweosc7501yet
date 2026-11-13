<script lang="ts">
	import { cover, uncover } from '#lib/client/cover.svelte.ts';
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
</script>

<header
	id="top-bar"
	class="top-bar"
	class:stays={cover.stays !== undefined}
	style:--fade={cover.fade}
	onfocusin={(event) => uncover(event.currentTarget)}
>
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
		class="button menu-button"
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
		header.top-bar {
			display: none;
		}
	}

	/* On the overview, the bar stays put and fades with the top. Focus shows it in full. */
	.stays {
		position: sticky;
		inset-block-start: var(--layout-page-padding-top);
		opacity: var(--fade);
	}

	.stays:has(:focus-visible) {
		opacity: 1;
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
