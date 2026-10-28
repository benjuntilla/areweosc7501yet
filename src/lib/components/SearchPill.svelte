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
	.search {
		display: flex;
		gap: var(--search-gap);
		align-items: center;
		inline-size: 100%;
		padding: var(--search-padding-y) var(--search-padding-x);
		color: var(--search-placeholder);
		background: var(--search-background);
		border: 0;
		border-radius: var(--search-radius);
		box-shadow:
			0 2px 2px -1px var(--search-shadow),
			0 1px 1px 0 var(--search-shadow),
			0 0 0 1px var(--search-ring);
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
