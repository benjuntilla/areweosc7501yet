<script lang="ts">
	import type { Side } from '#lib/domain/overview.ts';
	import Logo from './Logo.svelte';
	import Nav from './Nav.svelte';
	import SearchField from './SearchField.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	interface Props {
		sides: ReadonlyArray<Side>;
		current?: string | undefined;
		searchInput?: HTMLInputElement | undefined;
	}

	let { sides, current, searchInput = $bindable() }: Props = $props();
</script>

<div class="sidebar">
	<Logo />
	<SearchField bind:input={searchInput} />
	<Nav {sides} {current} />
	<ThemeToggle />
</div>

<style>
	.sidebar {
		position: fixed;
		top: var(--layout-page-padding-top);
		left: clamp(24px, 50% - 536px, 64px);
		width: 200px;
		max-height: calc(100svh - var(--layout-page-padding-top));
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.sidebar > :global(.search) {
		margin: 20px 0 24px;
	}

	.sidebar > :global(.theme-toggle) {
		margin: 32px 0 var(--layout-page-padding-top);
	}

	@media (width < 1100px) {
		.sidebar {
			display: none;
		}
	}
</style>
