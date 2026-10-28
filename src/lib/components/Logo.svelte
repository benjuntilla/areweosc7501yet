<script lang="ts">
	import { siteTitle } from '#lib/meta.ts';
	import StateGlyph from './StateGlyph.svelte';

	let { size = 48, onnavigate }: { size?: number; onnavigate?: () => void } = $props();
</script>

<a
	class="logo-tile"
	href="/"
	aria-label="{siteTitle} home"
	style:--size="{size}px"
	onclick={onnavigate}
>
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
		box-shadow: var(--logo-tile-shadow);
	}
</style>
