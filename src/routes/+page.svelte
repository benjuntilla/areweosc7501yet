<script lang="ts">
	import { afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { categoryOf, countMatches } from '#lib/client/filter.ts';
	import { search } from '#lib/client/search.svelte.ts';
	import Hero from '#lib/components/Hero.svelte';
	import Legend from '#lib/components/Legend.svelte';
	import Role from '#lib/components/Role.svelte';
	import Verdicts from '#lib/components/Verdicts.svelte';
	import { tick, untrack } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const categories = $derived(data.roles.flatMap((r) => r.categories));
	const query = $derived(search.query.trim());
	const matchCount = $derived(countMatches(categories, query));

	let expanded: Record<string, boolean> = $state({});
	let highlight: string | undefined = $state();

	// A link to /#kitty unfolds kitty's tail, scrolls to the chip, flashes it and opens its popover.
	// A link to a section scrolls to it after the search has filtered the page.
	// A deep link wins over a search that would hide its target.
	const followHash = async () => {
		const hash = decodeURIComponent(page.url.hash.slice(1));
		const all = /^(.*)-all$/u.exec(hash)?.[1];
		if (all !== undefined) {
			search.query = '';
			expanded[all] = true;
			await tick();
			document.querySelector(`#${CSS.escape(all)}`)?.scrollIntoView();
			return;
		}
		const shown =
			data.roles.find((r) => r.id === hash)?.categories ?? categories.filter((c) => c.id === hash);
		if (shown.length > 0) {
			if (countMatches(shown, query) === 0) search.query = '';
			await tick();
			document.querySelector(`#${CSS.escape(hash)}`)?.scrollIntoView();
			return;
		}
		const category = categoryOf(categories, hash);
		if (!category) return;
		search.query = '';
		if (category.more.some((chip) => chip.slug === hash)) expanded[category.id] = true;
		await tick();
		document.querySelector(`#${CSS.escape(hash)}`)?.scrollIntoView({ block: 'center' });
		highlight = hash;
		document.querySelector<HTMLElement>(`#popover-${CSS.escape(hash)}`)?.showPopover();
	};

	// Every arrival on the overview, including a ?q= change while on it, takes the URL's query.
	let arrived = $state(false);
	afterNavigate(() => {
		search.query = page.url.searchParams.get('q') ?? '';
		arrived = true;
		void followHash();
	});

	// Typing keeps ?q= in the URL so a search can be shared.
	// It reads location, not page.url, which replaceState doesn't update, so it can't loop.
	// It starts after the arrival: SvelteKit applies a replaceState from before then only after it,
	// so the URL would lose the ?q= of a shared search link.
	$effect(() => {
		const q = query;
		if (!arrived) return;
		untrack(() => {
			const url = new URL(location.href);
			if (q === '') url.searchParams.delete('q');
			else url.searchParams.set('q', q);
			if (url.search !== location.search) replaceState(url, {});
		});
	});
</script>

<svelte:window onhashchange={() => void followHash()} />

<div class="top">
	<Verdicts sides={data.sides} />
	<Hero />
</div>

<section class="tracker" aria-labelledby="tracker">
	<div class="tracker-head">
		<h2 class="type-section" id="tracker">What supports it?</h2>
		<Legend />
	</div>

	<div class="results type-small" role="status">
		{#if query !== '' && matchCount > 0}
			<p>{matchCount} {matchCount === 1 ? 'match' : 'matches'} for “{query}”</p>
		{:else if query !== ''}
			<p class="empty-title">Nothing matches “{query}”.</p>
		{/if}
	</div>

	{#each data.roles as role (role.id)}
		{#if countMatches(role.categories, query) > 0}
			<Role {role} {query} bind:expanded {highlight} />
		{/if}
	{/each}
</section>

<style>
	/* The top fills the rest of the first screen, and the hero sits at its foot, one section gap
	   above the fold. Above the top are the page padding and, below 1,100 px, the 36 px top bar and
	   a section gap. On a short window the top still keeps a section gap above the tracker. */
	.top {
		--above: var(--layout-page-padding-top);

		display: flex;
		flex-direction: column;
		gap: var(--layout-section-gap);
		min-block-size: calc(100svb - var(--above));
		padding-block-end: var(--layout-section-gap);
	}

	@media (width < 1100px) {
		.top {
			--above: calc(var(--layout-page-padding-top) + 36px + var(--layout-section-gap));
		}
	}

	.top > :global(.hero) {
		margin-block-start: auto;
	}

	.tracker {
		display: flex;
		flex-direction: column;
		gap: var(--layout-group-gap);
	}

	.tracker-head {
		display: flex;
		flex-direction: column;
		gap: var(--heading-legend-gap);
	}

	.results {
		margin-block-end: calc(var(--search-results-gap) - var(--layout-group-gap));
		color: var(--content-text-muted);
	}

	.results:empty {
		display: none;
	}

	.empty-title {
		color: var(--content-text-strong);
	}
</style>
