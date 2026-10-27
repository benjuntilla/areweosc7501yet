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
	afterNavigate(() => {
		search.query = page.url.searchParams.get('q') ?? '';
		void followHash();
	});

	// Typing keeps ?q= in the URL so a search can be shared.
	// It reads location, not page.url, which replaceState doesn't update, so it can't loop.
	$effect(() => {
		const q = query;
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
			<p>If you think it belongs here, <a href="/contribute">add it</a> and we’ll check.</p>
		{/if}
	</div>

	{#each data.roles as role (role.id)}
		{#if countMatches(role.categories, query) > 0}
			<Role {role} {query} bind:expanded {highlight} />
		{/if}
	{/each}

	<p class="cta">
		Missing a project, or see a state that’s out of date? <a href="/contribute"
			>Add or fix an entry</a
		>.
	</p>
</section>

<style>
	.top {
		display: flex;
		flex-direction: column;
		gap: var(--layout-section-gap);
		min-block-size: calc(100svb - 48px);
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

	.cta a,
	.results a {
		color: var(--content-text-strong);
	}
</style>
