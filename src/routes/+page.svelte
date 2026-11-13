<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { cover, uncover } from '#lib/client/cover.svelte.ts';
	import Hero from '#lib/components/Hero.svelte';
	import Legend from '#lib/components/Legend.svelte';
	import Role from '#lib/components/Role.svelte';
	import Verdicts from '#lib/components/Verdicts.svelte';
	import { Number as Num } from 'effect';
	import { flushSync, onMount, tick } from 'svelte';
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

	let top: HTMLDivElement | undefined = $state();
	let question: HTMLElement | undefined = $state();
	let hero: HTMLElement | undefined = $state();
	let tracker: HTMLElement | undefined = $state();

	// Where the topmost part that stays put sticks: the top bar below 1,100 px, else the title.
	let stuckTop = 0;

	// The content slides over what stays put, and its top edge is the covering edge. What stays
	// fades as the edge rises, and is gone when the edge reaches the topmost part. A side's verdict is
	// covered once the edge is above its top, or once it has scrolled out of the window.
	const onscroll = () => {
		const content = cover.stays === 'question' ? hero : tracker;
		if (content === undefined) return;
		const edge = content.getBoundingClientRect().top;
		cover.edge = edge;
		cover.fade = Num.clamp((edge - stuckTop) / (edge + scrollY - stuckTop), {
			minimum: 0,
			maximum: 1
		});
		for (const side of data.sides) {
			const verdict = document.querySelector(`#verdict-${side.id}`)?.getBoundingClientRect();
			cover.covered[side.id] =
				verdict !== undefined && (edge <= verdict.top || verdict.bottom <= 0);
		}
	};

	// The whole top stays put when "What's that?" ends on the first screen at rest, else the title
	// and verdicts when they do, else nothing. The first screen is the small viewport, with any
	// mobile toolbars shown, so the choice holds while they hide.
	const measure = () => {
		flushSync(() => (cover.stays = undefined));
		const fold = document.documentElement.clientHeight;
		const fits = (part: HTMLElement | undefined) =>
			part !== undefined && part.getBoundingClientRect().bottom + scrollY <= fold;
		const topmost = [document.querySelector('#top-bar'), question].find((part) =>
			part?.checkVisibility()
		);
		stuckTop = (topmost?.getBoundingClientRect().top ?? 0) + scrollY;
		flushSync(() => (cover.stays = fits(hero) ? 'top' : fits(question) ? 'question' : undefined));
		onscroll();
	};

	onMount(() => {
		if (top === undefined) return;
		// The top resizes when its text wraps or its fonts load. The window can also grow taller
		// without resizing the top, and that can make the whole top fit.
		const observer = new ResizeObserver(measure);
		observer.observe(top);
		addEventListener('resize', measure);
		// The document hears the scroll before the window does, so the top bar, which listens on the
		// window, reads where the content is after this scroll.
		document.addEventListener('scroll', onscroll, { passive: true });
		return () => {
			observer.disconnect();
			removeEventListener('resize', measure);
			document.removeEventListener('scroll', onscroll);
			cover.stays = undefined;
			cover.fade = 1;
			cover.edge = Infinity;
			cover.covered = {};
		};
	});
</script>

<svelte:window onhashchange={() => void followHash()} />

<div
	class="top"
	data-stays={cover.stays}
	style:--fade={cover.fade}
	bind:this={top}
	onfocusin={(event) => {
		if (cover.stays === 'top') uncover(event.currentTarget);
	}}
>
	<Verdicts sides={data.sides} bind:element={question} />
	<Hero bind:element={hero} />
</div>

<section class="tracker" aria-labelledby="tracker" bind:this={tracker}>
	<div class="tracker-head">
		<h2 class="type-section" id="tracker">What supports it?</h2>
		<Legend />
	</div>

	{#each data.roles as role (role.id)}
		<Role {role} bind:expanded {highlight} />
	{/each}

	<p class="cta">
		Missing a project, or see a state that’s out of date? <a href="/contribute"
			>Add or fix an entry</a
		>.
	</p>
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

	/* What stays put sticks where it rests and fades as the content covers it. */
	.top[data-stays='top'],
	.top[data-stays='question'] > :global(.question) {
		position: sticky;
		inset-block-start: var(--above);
		opacity: var(--fade);
	}

	/* The content that slides over carries the page's paper a little above its heading, so the
	   covering edge never runs through the heading. When only the title and verdicts stay,
	   "What's that?" slides too, and takes the top's foot so no gap shows before the list. */
	.top[data-stays] + .tracker,
	.top[data-stays='question'] > :global(.hero) {
		position: relative;
		padding-block-start: var(--tracker-cover-lead);
		margin-block-start: calc(var(--tracker-cover-lead) * -1);
		background: var(--page-background);
	}

	.top[data-stays='question'] {
		padding-block-end: 0;
	}

	.top[data-stays='question'] > :global(.hero) {
		padding-block-end: var(--layout-section-gap);
	}

	.tracker-head {
		display: flex;
		flex-direction: column;
		gap: var(--heading-legend-gap);
	}

	.cta a {
		color: var(--content-text-strong);
	}
</style>
