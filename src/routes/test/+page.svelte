<script lang="ts">
	import CodeCard from '#lib/components/CodeCard.svelte';
	import Head from '#lib/components/Head.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Head
	title="Test your terminal"
	description="Check whether your terminal answers the OSC 7501 query."
/>

<article class="page-head">
	<h1 class="type-h1">Test your terminal</h1>
	<p>Paste this command into the terminal that you want to test.</p>
	<CodeCard label="any shell" code={data.snippet} html={data.html} />
</article>
