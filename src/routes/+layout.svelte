<script lang="ts">
	import '../styles/tokens.css';
	import '../styles/base.css';
	import inter from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import Footer from '#lib/components/Footer.svelte';
	import Rail from '#lib/components/Rail.svelte';
	import Sidebar from '#lib/components/Sidebar.svelte';
	import TopBar from '#lib/components/TopBar.svelte';
	import { siteTitle } from '#lib/meta.ts';
	import { tick } from 'svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let sidebarInput: HTMLInputElement | undefined = $state();
	let topBarInput: HTMLInputElement | undefined = $state();
	let searching = $state(false);
	let current: string | undefined = $state();

	const sectionIds = $derived(
		data.sides.flatMap((side) => [side.id].concat(side.categories.map((c) => c.id)))
	);

	// ⌘K or Ctrl+K focuses search from anywhere: the sidebar field, or the top bar's on phones.
	const onkeydown = async (event: KeyboardEvent) => {
		if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
		event.preventDefault();
		if (sidebarInput?.checkVisibility()) sidebarInput.focus();
		else {
			searching = true;
			await tick();
			topBarInput?.focus();
		}
	};

	$effect(() => {
		if (page.url.pathname !== '/') return;
		const sections = sectionIds.flatMap((id) => document.querySelector(`#${id}`) ?? []);
		const onscroll = () => {
			current = sections.findLast((s) => s.getBoundingClientRect().top < innerHeight / 3)?.id;
		};
		onscroll();
		addEventListener('scroll', onscroll, { passive: true });
		return () => {
			removeEventListener('scroll', onscroll);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preload" href={inter} as="font" type="font/woff2" crossorigin="anonymous" />
	<link rel="alternate" type="application/atom+xml" title={siteTitle} href="/feed.xml" />
</svelte:head>

<svelte:window {onkeydown} />

<a class="skip-link" href="#content">Skip to content</a>

<Sidebar sides={data.sides} {current} bind:searchInput={sidebarInput} />

<div class="column">
	<TopBar sides={data.sides} {current} bind:searching bind:searchInput={topBarInput} />
	<main id="content" tabindex="-1">
		{@render children()}
	</main>
	<Footer updated={data.updated} spec={data.spec} />
</div>

<Rail sides={data.sides} />

<style>
	.skip-link {
		position: fixed;
		top: 16px;
		left: clamp(24px, 50% - 536px, 64px);
		z-index: 10;
		padding: var(--nav-item-padding-y) var(--nav-item-padding-x);
		border-radius: var(--nav-item-radius);
		background: var(--card-background);
		color: var(--content-text-strong);
		translate: 0 -200%;
	}

	.skip-link:focus-visible {
		translate: 0 0;
	}

	.column {
		display: flex;
		flex-direction: column;
		gap: var(--layout-section-gap);
		width: 576px;
		margin-left: max(272px, 50% - 288px);
		padding: var(--layout-page-padding-top) 0 var(--layout-page-padding-bottom);
	}

	main:focus {
		outline: none;
	}

	@media (width < 1100px) {
		.column {
			width: auto;
			margin: 0;
			padding-inline: var(--layout-page-padding-x);
		}
	}
</style>
