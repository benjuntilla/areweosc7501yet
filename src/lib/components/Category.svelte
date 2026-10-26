<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { matches } from '#lib/client/filter.ts';
	import type { CategoryView } from '#lib/domain/overview.ts';
	import { tick } from 'svelte';
	import Chip from './Chip.svelte';

	interface Props {
		category: CategoryView;
		query: string;
		/** Unfolded by a deep link, such as /#kitty or /#coding-agents-all. */
		expanded?: boolean;
		highlight?: string | undefined;
	}

	let { category, query, expanded = $bindable(false), highlight }: Props = $props();

	let toggle: HTMLButtonElement | undefined = $state();

	const featured = $derived(category.featured.filter((c) => matches(c, query)));
	const more = $derived(category.more.filter((c) => matches(c, query)));
	const searching = $derived(query.trim() !== '');
	// Search unfolds any tail with a match.
	const open = $derived(searching ? more.length > 0 : expanded);

	// The toggle keeps focus as it moves to the end of the list, and the URL can be shared.
	const onclick = async () => {
		expanded = !expanded;
		const url = new URL(location.href);
		url.hash = expanded ? `${category.id}-all` : '';
		replaceState(url, {});
		await tick();
		toggle?.scrollIntoView({ block: 'nearest' });
	};
</script>

{#if featured.length > 0 || more.length > 0}
	<section class="category" id={category.id} aria-labelledby="{category.id}-head">
		<h4 class="type-h3" id="{category.id}-head">{category.name}</h4>
		<div class="chips">
			<ul class="list">
				{#each featured as chip (chip.slug)}
					<Chip {chip} highlight={highlight === chip.slug} />
				{/each}
			</ul>
			{#if category.more.length > 0}
				<div class="tail" class:open id="{category.id}-more">
					<div class="tail-inner">
						<p class="more-label type-caption">
							More projects · {searching
								? `${more.length} of ${category.more.length}`
								: category.more.length}
						</p>
						<ul class="list">
							{#each more as chip (chip.slug)}
								<Chip {chip} highlight={highlight === chip.slug} />
							{/each}
						</ul>
					</div>
				</div>
				{#if !searching}
					<button
						bind:this={toggle}
						class="more-chip type-small"
						class:open
						type="button"
						aria-expanded={open}
						aria-controls="{category.id}-more"
						{onclick}>{open ? 'Show fewer' : `+ ${category.more.length} more`}</button
					>
				{/if}
			{/if}
		</div>
	</section>
{/if}

<style>
	.category {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px var(--chip-list-gap);
	}

	.list {
		display: contents;
	}

	.tail {
		display: grid;
		grid-template-rows: 0fr;
		flex-basis: 100%;
		order: 2;
		transition: grid-template-rows var(--motion-toc-unfold-duration) cubic-bezier(0.4, 0, 0.2, 1);
	}

	.tail.open {
		grid-template-rows: 1fr;
		transition-timing-function: var(--motion-ease-unfold);
	}

	.tail-inner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px var(--chip-list-gap);
		min-height: 0;
		overflow: hidden;
		padding: 2px;
		margin: -2px;
	}

	.tail:not(.open) .tail-inner {
		visibility: hidden;
	}

	.tail-inner > * {
		opacity: 0;
		translate: 0 var(--motion-rail-label-distance);
		transition:
			opacity var(--motion-rail-label-exit-duration) ease-out,
			translate var(--motion-rail-label-exit-duration) ease-in;
	}

	.open .tail-inner > * {
		opacity: 1;
		translate: 0 0;
		transition:
			opacity var(--motion-rail-label-duration) var(--motion-ease-reveal),
			translate var(--motion-rail-label-duration) var(--motion-ease-reveal);
	}

	.more-label {
		flex-basis: 100%;
		padding-top: 4px;
		color: var(--content-text-muted);
	}

	.more-chip {
		order: 1;
		padding: var(--more-chip-padding-y) var(--more-chip-padding-x);
		border-radius: var(--more-chip-radius);
		background: var(--chip-background);
		color: var(--chip-label-muted);
		transition: background-color var(--motion-state-duration) var(--motion-ease-state);
	}

	.more-chip.open {
		order: 3;
	}

	.more-chip:hover {
		background: var(--more-chip-background-hover);
	}

	.more-chip:active {
		background: var(--more-chip-background-pressed);
	}

	/* Without JavaScript the tail stays open and the toggle can't work. */
	:global(html:not(.js)) .tail {
		grid-template-rows: 1fr;
	}

	:global(html:not(.js)) .tail-inner,
	:global(html:not(.js)) .tail-inner > * {
		visibility: visible;
		opacity: 1;
		translate: 0 0;
	}

	:global(html:not(.js)) .more-chip {
		display: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.tail,
		.tail-inner > *,
		.open .tail-inner > * {
			transition: opacity var(--motion-state-duration) ease-out;
			translate: 0 0;
		}
	}
</style>
