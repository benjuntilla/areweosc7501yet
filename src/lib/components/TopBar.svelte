<script lang="ts">
	import { tick } from 'svelte';
	import type { Side } from '#lib/domain/overview.ts';
	import Icon from './Icon.svelte';
	import Logo from './Logo.svelte';
	import Nav from './Nav.svelte';
	import SearchField from './SearchField.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	interface Props {
		sides: ReadonlyArray<Side>;
		current?: string | undefined;
		searching?: boolean;
		searchInput?: HTMLInputElement | undefined;
	}

	let { sides, current, searching = $bindable(false), searchInput = $bindable() }: Props = $props();

	let sheet: HTMLDialogElement | undefined = $state();
	let menuOpen = $state(false);

	// The menu opens and closes through invoker commands, so it works without JavaScript too.
	const closeMenu = () => sheet?.close();

	let searchButton: HTMLButtonElement | undefined = $state();

	const closeSearch = async () => {
		searching = false;
		await tick();
		searchButton?.focus();
	};

	const openSearch = async () => {
		searching = true;
		await tick();
		searchInput?.focus();
	};
</script>

<header class="top-bar">
	{#if searching}
		<div class="search-row">
			<SearchField bind:input={searchInput} onescape={closeSearch} />
			<button class="button" type="button" aria-label="Close search" onclick={closeSearch}>
				<Icon name="close" />
			</button>
		</div>
	{:else}
		<Logo size={36} />
		<span class="spacer"></span>
		<button
			bind:this={searchButton}
			class="button search-button"
			type="button"
			aria-label="Search"
			aria-expanded={searching}
			onclick={openSearch}
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
		>
			<Icon name="menu" />
		</button>
	{/if}
</header>

<dialog
	id="menu"
	class="sheet"
	bind:this={sheet}
	aria-label="Menu"
	ontoggle={(event) => (menuOpen = event.newState === 'open')}
>
	<div class="top-bar">
		<Logo size={36} />
		<span class="spacer"></span>
		<button class="button" type="button" aria-label="Close menu" commandfor="menu" command="close">
			<Icon name="close" />
		</button>
	</div>
	<Nav {sides} {current} autofocus onnavigate={closeMenu} />
	<ThemeToggle />
</dialog>

<style>
	.top-bar {
		display: flex;
		align-items: center;
		gap: var(--top-bar-gap);
	}

	@media (width >= 1100px) {
		header.top-bar {
			display: none;
		}
	}

	.spacer {
		flex: 1;
	}

	.search-row {
		display: flex;
		align-items: center;
		gap: var(--top-bar-gap);
		width: 100%;
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
		border-radius: var(--top-bar-button-radius);
		background: var(--top-bar-button-background);
		color: var(--top-bar-icon-strong);
		box-shadow:
			0 2px 2px -1px var(--top-bar-button-shadow),
			0 1px 1px -0.5px var(--top-bar-button-shadow),
			0 0 0 0.5px var(--top-bar-button-ring);
	}

	.button::before {
		content: '';
		position: absolute;
		inset: -4px;
	}

	.sheet {
		width: 100%;
		max-width: none;
		height: 100%;
		max-height: none;
		margin: 0;
		padding: var(--layout-page-padding-top) var(--layout-page-padding-x) var(--space-40);
		border: 0;
		background: var(--page-background);
		color: inherit;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.sheet[open] {
		display: flex;
		flex-direction: column;
		gap: var(--space-20);
	}

	.sheet :global(.item) {
		padding: var(--space-10) var(--space-12);
		border-radius: var(--radius-8);
		font-size: var(--type-body-size);
		line-height: var(--type-body-line-height);
	}

	.sheet :global(.nav),
	.sheet :global(.nav > ul > li),
	.sheet :global(.item) {
		width: 100%;
	}

	.sheet :global(.item[aria-current='page']) {
		background: var(--chip-background);
	}

	.sheet :global(.group) {
		padding: var(--space-18) 0 var(--space-6) var(--space-12);
	}
</style>
