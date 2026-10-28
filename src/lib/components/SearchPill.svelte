<script lang="ts">
	import { loadSearch, searchKeys } from '#lib/client/search.ts';
	import Icon from './Icon.svelte';

	interface Props {
		onsearch: (trigger: HTMLElement) => void;
	}

	let { onsearch }: Props = $props();
</script>

<button
	class="search"
	type="button"
	aria-haspopup="dialog"
	aria-keyshortcuts={searchKeys}
	onpointerenter={loadSearch}
	onfocus={loadSearch}
	onclick={(event) => onsearch(event.currentTarget)}
>
	<Icon name="search" class="icon" />
	<span class="label type-nav">Find a program</span>
	<span class="hint type-caption" aria-hidden="true">⌘K</span>
</button>

<style>
	/* Rex's pill: the page color inside a 1 px edge that darkens toward the bottom. */
	.search {
		display: flex;
		gap: var(--search-gap);
		align-items: center;
		inline-size: 100%;
		padding: var(--search-padding-y) var(--search-padding-x);
		color: var(--search-placeholder);
		background:
			linear-gradient(var(--search-background), var(--search-background)) padding-box,
			linear-gradient(var(--search-edge-top), var(--search-edge-bottom)) border-box;
		border: var(--search-edge-width) solid transparent;
		border-radius: var(--search-radius);
		transition: filter var(--motion-state-duration) var(--motion-ease-state);
	}

	.search:hover {
		filter: brightness(var(--search-hover-brightness));
	}

	.search:focus-visible {
		background:
			linear-gradient(var(--search-focus-tint), var(--search-focus-tint)) padding-box,
			linear-gradient(var(--search-background), var(--search-background)) padding-box,
			linear-gradient(var(--search-edge-top), var(--search-edge-bottom)) border-box;
	}

	:global(html:not(.js)) .search {
		display: none;
	}

	.search :global(.icon) {
		inline-size: var(--search-icon-size);
		block-size: var(--search-icon-size);
		color: var(--search-icon);
	}

	.label {
		flex: 1;
		text-align: start;
	}
</style>
