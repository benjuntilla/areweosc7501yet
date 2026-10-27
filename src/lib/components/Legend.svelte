<script lang="ts">
	import type { State } from '#lib/domain/schema.ts';
	import StateGlyph from './StateGlyph.svelte';

	const legend: ReadonlyArray<readonly [State, string]> = [
		['done', 'shipped in a stable release'],
		['working', 'merged & waiting for release, or PR open'],
		['blocked', 'attempt stopped, may resume'],
		['idle', 'nothing yet'],
		['error', 'declined by maintainer']
	];
</script>

<dl class="type-small">
	{#each legend as [state, meaning] (state)}
		<div>
			<dt><StateGlyph {state} />{state}</dt>
			<dd>{meaning}</dd>
		</div>
	{/each}
</dl>

<style>
	dl {
		display: flex;
		flex-wrap: wrap;
		gap: var(--legend-item-gap) var(--legend-gap);
	}

	dl div {
		display: flex;
		gap: var(--legend-item-gap);
		align-items: center;
	}

	dt {
		display: flex;
		gap: var(--legend-item-gap);
		align-items: center;
		color: var(--legend-state-name);
	}

	dd {
		color: var(--legend-description);
	}
</style>
