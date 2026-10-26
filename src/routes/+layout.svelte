<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="alternate" type="application/atom+xml" title="Are we OSC 7501 yet?" href="/feed.xml" />
</svelte:head>

{@render children()}
