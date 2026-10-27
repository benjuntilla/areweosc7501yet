<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { search } from '#lib/client/search.svelte.ts';
	import Icon from './Icon.svelte';

	interface Props {
		input?: HTMLInputElement | undefined;
		/** Escape on an empty field, for the phone overlay to close itself. */
		onescape?: () => void;
	}

	let { input = $bindable(), onescape }: Props = $props();

	const onkeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape') return;
		if (search.query === '') onescape?.();
		search.query = '';
	};

	// Off the overview, Enter takes the query there.
	const onsubmit = (event: SubmitEvent) => {
		event.preventDefault();
		if (page.url.pathname !== '/') void goto(`/?q=${encodeURIComponent(search.query)}`);
	};
</script>

<search class="search">
	<form action="/" method="get" {onsubmit}>
		<Icon name="search" class="icon" />
		<input
			bind:this={input}
			bind:value={search.query}
			{onkeydown}
			type="search"
			name="q"
			placeholder="Find a program"
			aria-label="Find a program"
			aria-keyshortcuts="Meta+K Control+K"
			autocomplete="off"
			spellcheck="false"
		/>
		<span class="hint type-caption" aria-hidden="true">{search.query === '' ? '⌘K' : 'esc'}</span>
	</form>
</search>

<style>
	.search {
		display: block;
		inline-size: 100%;
	}

	:global(html:not(.js)) .search {
		display: none;
	}

	form {
		display: flex;
		gap: var(--search-gap);
		align-items: center;
		padding: var(--search-padding-y) var(--search-padding-x);
		background: var(--search-background);
		border-radius: var(--search-radius);
		box-shadow:
			0 2px 2px -1px var(--search-shadow),
			0 1px 1px 0 var(--search-shadow),
			0 0 0 1px var(--search-ring);
	}

	form:focus-within {
		box-shadow: 0 0 0 var(--search-focus-stroke-width) var(--focus-ring-stroke);
	}

	form :global(.icon) {
		color: var(--search-icon);
	}

	input {
		flex: 1;
		min-inline-size: 0;
		padding: 0;
		font-size: var(--type-nav-size);
		line-height: var(--type-nav-line-height);
		color: var(--content-text-strong);
		outline: none;
		background: none;
		border: 0;
	}

	input::placeholder {
		color: var(--search-placeholder);
		opacity: 1;
	}

	input::-webkit-search-cancel-button {
		appearance: none;
	}

	.hint {
		color: var(--search-placeholder);
	}
</style>
