<script lang="ts">
	import { page } from '$app/state';
	import { siteTitle, siteUrl } from '#lib/meta.ts';

	let { title, description }: { title?: string; description: string } = $props();

	const fullTitle = $derived(title === undefined ? siteTitle : `${title} · ${siteTitle}`);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={new URL(page.url.pathname, siteUrl).href} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
</svelte:head>
