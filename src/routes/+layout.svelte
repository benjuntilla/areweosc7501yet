<script lang="ts">
	import '../styles/tokens.css';
	import '../styles/base.css';
	import inter from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import Footer from '#lib/components/Footer.svelte';
	import Rail from '#lib/components/Rail.svelte';
	import SearchDialog from '#lib/components/SearchDialog.svelte';
	import Sidebar from '#lib/components/Sidebar.svelte';
	import TopBar from '#lib/components/TopBar.svelte';
	import { siteTitle, siteUrl } from '#lib/meta.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let searchDialog: SearchDialog | undefined = $state();
	let current: string | undefined = $state();

	const onsearch = (trigger: HTMLElement) => void searchDialog?.open(trigger);

	// ⌘K or Ctrl+K opens search from anywhere, and so does / outside a text field. Either presses the
	// search button that shows: the sidebar's, or the top bar's below 1,100 px.
	const onkeydown = (event: KeyboardEvent) => {
		const k = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);
		const slash =
			event.key === '/' &&
			!(
				event.target instanceof Element &&
				event.target.matches('input, textarea, [contenteditable]')
			);
		if (!k && !slash) return;
		event.preventDefault();
		const buttons = document.querySelectorAll<HTMLElement>('[aria-keyshortcuts]');
		[...buttons].find((button) => button.checkVisibility())?.click();
	};

	// A new page lands at once. Only moves within a page glide.
	beforeNavigate(({ from, to }) => {
		if (from?.url.pathname !== to?.url.pathname)
			document.documentElement.style.scrollBehavior = 'auto';
	});
	afterNavigate(() => {
		document.documentElement.style.scrollBehavior = '';
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="preload" href={inter} as="font" type="font/woff2" crossorigin="anonymous" />
	<link rel="alternate" type="application/atom+xml" title={siteTitle} href="/feed.xml" />
	<meta property="og:image" content={new URL('/og.png', siteUrl).href} />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<svelte:window {onkeydown} />

<a class="skip-link" href="#content">Skip to content</a>

<Sidebar sides={data.sides} bind:current {onsearch} />

<div class="column">
	<TopBar sides={data.sides} {current} {onsearch} />
	<main id="content" tabindex="-1">
		{@render children()}
	</main>
	<Footer updated={data.updated} spec={data.spec} />
</div>

<Rail sides={data.sides} />

<SearchDialog bind:this={searchDialog} />

<style>
	.skip-link {
		position: fixed;
		inset-block-start: 16px;
		inset-inline-start: clamp(24px, 50% - 536px, 64px);
		z-index: 10;
		padding: var(--nav-item-padding-y) var(--nav-item-padding-x);
		color: var(--content-text-strong);
		background: var(--card-background);
		border-radius: var(--nav-item-radius);
		translate: 0 -200%;
	}

	.skip-link:focus-visible {
		translate: 0 0;
	}

	.column {
		display: flex;
		flex-direction: column;
		gap: var(--layout-section-gap);
		inline-size: 576px;
		padding: var(--layout-page-padding-top) 0 var(--layout-page-padding-bottom);
		/* stylelint-disable-next-line declaration-property-unit-allowed-list -- page grid: the 576px column centers in the window but stays clear of the sidebar */
		margin-inline-start: max(272px, 50% - 288px);
	}

	/* stylelint-disable-next-line a11y/no-outline-none -- main takes focus only from the skip link, which shows the ring */
	main:focus {
		outline: none;
	}

	@media (width < 1100px) {
		.column {
			inline-size: auto;
			padding-inline: var(--layout-page-padding-x);
			margin: 0;
		}
	}
</style>
