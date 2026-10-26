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

<dl class="legend type-small">
	{#each legend as [state, meaning] (state)}
		<div>
			<dt><StateGlyph {state} />{state}</dt>
			<dd>{meaning}</dd>
		</div>
	{/each}
</dl>
<p class="learn type-small">
	Learn more about each state <a href="/methodology"
		>here<span class="visually-hidden">: Methodology</span></a
	>.
</p>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 6px var(--legend-gap);
		margin-bottom: -4px;
	}

	.legend div {
		display: flex;
		align-items: center;
		gap: var(--legend-item-gap);
	}

	dt {
		display: flex;
		align-items: center;
		gap: var(--legend-item-gap);
		color: var(--legend-state-name);
	}

	dd,
	.learn {
		color: var(--legend-description);
	}

	a {
		color: var(--content-text-strong);
	}
</style>
