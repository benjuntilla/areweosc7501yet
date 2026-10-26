<script lang="ts">
	import { siteTitle } from '#lib/meta.ts';
	import NotFoundCard from '#lib/components/NotFoundCard.svelte';
	import StateWord from '#lib/components/StateWord.svelte';
</script>

<svelte:head>
	<title>Nothing here · {siteTitle}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<article class="page">
	<NotFoundCard />
	<div class="page-head">
		<h1 class="type-h1">Nothing here</h1>
		<p class="error-line">
			<StateWord state="error" />: request for this page closed as not planned.
		</p>
		<p>Go back to <a href="/">the overview</a>.</p>
	</div>
</article>

<style>
	/* Without hydration the theme toggle and search do nothing here, and the menu button works only
	   in browsers with invoker commands (not Safari before 26.2), so they hide. */
	:global(:is(.theme-toggle, .search, .search-button, .menu-button)) {
		display: none !important;
	}

	/* The nav keeps the gap that the hidden search pill leaves below itself. */
	:global(.sidebar > .nav) {
		margin-block-start: var(--sidebar-search-margin-bottom);
	}

	.error-line :global(.state-inline) {
		margin-inline-start: 0;
	}
</style>
