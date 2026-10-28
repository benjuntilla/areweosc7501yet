<script lang="ts">
	import { siteTitle } from '#lib/meta.ts';
	import CodeCard from '#lib/components/CodeCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Test your terminal · {siteTitle}</title>
	<meta name="description" content="Check whether your terminal answers the OSC 7501 query." />
</svelte:head>

<article class="page-head">
	<h1 class="type-h1">Test your terminal</h1>
	<p>Paste this command into the terminal that you want to test.</p>
	<CodeCard label="any shell" code={data.snippet} html={data.html} />
</article>
