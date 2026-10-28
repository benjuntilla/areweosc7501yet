<script lang="ts">
	import { replaceState } from '$app/navigation';
	import type { CategoryView } from '#lib/domain/overview.ts';
	import { tick } from 'svelte';
	import Chip from './Chip.svelte';

	interface Props {
		category: CategoryView;
		/** Unfolded by a deep link, such as /#kitty or /#coding-agents-all. */
		expanded?: boolean;
		highlight?: string | undefined;
	}

	let { category, expanded = $bindable(false), highlight }: Props = $props();

	let toggle: HTMLButtonElement | undefined = $state();
	let tail: HTMLDivElement | undefined = $state();
	let folded = $state(false);

	// The URL can be shared. Unfolding from the keyboard moves focus to the first revealed chip,
	// which comes before the toggle in tab order. Otherwise the toggle keeps focus and stays in view.
	const onclick = async () => {
		expanded = !expanded;
		folded = !expanded;
		const url = new URL(location.href);
		url.hash = expanded ? `${category.id}-all` : '';
		replaceState(url, {});
		await tick();
		if (expanded && toggle?.matches(':focus-visible')) tail?.querySelector('button')?.focus();
		else toggle?.scrollIntoView({ block: 'nearest' });
	};
</script>

<section class="category" id={category.id} aria-labelledby="{category.id}-head">
	<h4 class="type-h3" id="{category.id}-head">{category.name}</h4>
	<div class="chips">
		<ul class="list">
			{#each category.featured as chip (chip.slug)}
				<Chip {chip} highlight={highlight === chip.slug} />
			{/each}
		</ul>
		{#if category.more.length > 0}
			<div bind:this={tail} class="tail" class:open={expanded} id="{category.id}-more">
				<div class="tail-inner">
					<p class="more-label type-caption">More projects</p>
					<ul class="list">
						{#each category.more as chip (chip.slug)}
							<Chip {chip} highlight={highlight === chip.slug} />
						{/each}
					</ul>
				</div>
			</div>
			<button
				bind:this={toggle}
				class="more-chip type-small"
				class:open={expanded}
				class:folded
				type="button"
				aria-expanded={expanded}
				aria-controls="{category.id}-more"
				{onclick}>{expanded ? 'Show fewer' : `+ ${category.more.length} more`}</button
			>
		{/if}
	</div>
</section>

<style>
	.category {
		display: flex;
		flex-direction: column;
		gap: var(--heading-category-gap);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--chip-list-row-gap) var(--chip-list-gap);
		align-items: center;
		transition: margin-block-end var(--motion-toc-unfold-duration) cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* A folded tail still starts a flex line of its own, so take back the row gap above it. */
	:global(html.js) :has(> .tail:not(.open)) {
		margin-block-end: calc(var(--chip-list-row-gap) * -1);
	}

	.list {
		display: contents;
	}

	/* Folding hides the tail only once it has closed, so its rows can fade out first. */
	.tail {
		display: grid;
		flex-basis: 100%;
		grid-template-rows: 0fr;
		order: 2;
		transition:
			grid-template-rows var(--motion-toc-unfold-duration) cubic-bezier(0.4, 0, 0.2, 1),
			visibility 0s var(--motion-toc-unfold-duration);
	}

	.tail.open,
	:global(html:not(.js)) .tail {
		grid-template-rows: 1fr;
		transition-delay: 0s;
		transition-timing-function: var(--motion-ease-unfold);
	}

	:global(html.js) .tail:not(.open) {
		visibility: hidden;
	}

	.tail-inner {
		display: flex;
		flex-wrap: wrap;
		gap: var(--chip-list-row-gap) var(--chip-list-gap);
		align-items: center;
		min-block-size: 0;
		padding: var(--focus-ring-stroke-width);
		margin: calc(var(--focus-ring-stroke-width) * -1);
		overflow: hidden;
	}

	.tail-inner > * {
		opacity: 0;
		translate: 0 var(--motion-rail-label-distance);
		transition: var(--transition-lift-out);
	}

	.open .tail-inner > * {
		opacity: 1;
		translate: 0 0;
		transition: var(--transition-lift-in);
	}

	.more-label {
		flex-basis: 100%;
		padding-block-start: var(--chip-list-label-gap);
		color: var(--content-text-muted);
	}

	.more-chip {
		order: 1;
		padding: var(--more-chip-padding-y) var(--more-chip-padding-x);
		color: var(--chip-label-muted);
		background: var(--chip-background);
		border-radius: var(--more-chip-radius);
		transition: background-color var(--motion-state-duration) var(--motion-ease-state);
	}

	.more-chip.open {
		order: 3;
	}

	/* After "Show fewer", "+ N more" fades back in while the rows fade out. */
	.more-chip.folded {
		animation: fade-in var(--motion-state-duration) var(--motion-ease-state)
			var(--motion-state-duration) backwards;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}

	.more-chip:hover {
		background: var(--more-chip-background-hover);
	}

	.more-chip:active {
		background: var(--more-chip-background-pressed);
	}

	/* Without JavaScript the tail stays open and the toggle can't work. */
	:global(html:not(.js)) .tail-inner > * {
		opacity: 1;
		translate: 0 0;
	}

	:global(html:not(.js)) .more-chip {
		display: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.chips,
		.tail,
		.tail-inner > *,
		.open .tail-inner > * {
			translate: 0 0;
			transition: opacity var(--motion-state-duration) ease-out;
		}

		.more-chip.folded {
			animation: none;
		}
	}
</style>
