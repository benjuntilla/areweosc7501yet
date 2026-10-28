<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import Hero from '#lib/components/Hero.svelte';
	import Legend from '#lib/components/Legend.svelte';
	import Role from '#lib/components/Role.svelte';
	import Verdicts from '#lib/components/Verdicts.svelte';
	import { tick } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const categories = $derived(data.roles.flatMap((r) => r.categories));

	let expanded: Record<string, boolean> = $state({});
	let highlight: string | undefined = $state();

	// A link to /#kitty unfolds kitty's tail, scrolls to the chip, flashes it and opens its popover.
	const followHash = async () => {
		const hash = decodeURIComponent(page.url.hash.slice(1));
		const all = /^(.*)-all$/u.exec(hash)?.[1];
		if (all !== undefined) {
			expanded[all] = true;
			await tick();
			document.querySelector(`#${CSS.escape(all)}`)?.scrollIntoView();
			return;
		}
		const category = categories.find((c) =>
			c.featured.concat(c.more).some((chip) => chip.slug === hash)
		);
		if (!category) return;
		if (category.more.some((chip) => chip.slug === hash)) expanded[category.id] = true;
		await tick();
		document.querySelector(`#${CSS.escape(hash)}`)?.scrollIntoView({ block: 'center' });
		highlight = hash;
		document.querySelector<HTMLElement>(`#popover-${CSS.escape(hash)}`)?.showPopover();
	};

	afterNavigate(() => void followHash());
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

	{#each data.roles as role (role.id)}
		<Role {role} bind:expanded {highlight} />
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
</style>
