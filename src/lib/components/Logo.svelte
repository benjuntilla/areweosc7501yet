<script lang="ts">
	import { siteTitle } from '#lib/meta.ts';
	import StateGlyph from './StateGlyph.svelte';

	let { size = 48 }: { size?: number } = $props();
</script>

<a class="logo-tile" href="/" aria-label="{siteTitle} home" style:--size="{size}px">
	<StateGlyph state="working" size={size / 2} spin={false} />
</a>

<style>
	.logo-tile {
		display: grid;
		place-items: center;
		inline-size: var(--size);
		block-size: var(--size);
		background: var(--logo-tile-background);
		border-radius: calc(var(--size) / 4);
		box-shadow:
			0 2px 1px var(--logo-tile-shadow),
			0 1px 0.5px var(--logo-tile-shadow),
			0 0 0 0.5px var(--logo-tile-ring);
	}
</style>
