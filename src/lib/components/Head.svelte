<script lang="ts">
	import { page } from '$app/state';
	import { siteUrl } from '#lib/meta.ts';

	let { title, description }: { title: string; description: string } = $props();
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={new URL(page.url.pathname, siteUrl).href} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
</svelte:head>
