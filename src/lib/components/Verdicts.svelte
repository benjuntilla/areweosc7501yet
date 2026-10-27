<script lang="ts">
	import type { Side } from '#lib/domain/overview.ts';
	import { siteTitle } from '#lib/meta.ts';
	import Icon from './Icon.svelte';
	import Meter from './Meter.svelte';

	let { sides }: { sides: ReadonlyArray<Side> } = $props();
</script>

<svelte:head>
	<title>{siteTitle}</title>
	<meta
		name="description"
		content="Which programs and terminals support OSC 7501, the Program Status Protocol."
	/>
</svelte:head>

<section class="question" aria-labelledby="title">
	<h1 class="type-h1" id="title">{siteTitle}</h1>
	<dl class="verdicts">
		{#each sides as side (side.id)}
			<div class="verdict" id="verdict-{side.id}">
				<dt class="type-lead"><Icon name={side.role} size={18} />{side.name}:</dt>
				<dd class="type-verdict">{side.verdict}</dd>
				<dd><Meter {side} /></dd>
			</div>
		{/each}
	</dl>
</section>

<style>
	.question {
		display: flex;
		flex-direction: column;
		gap: var(--layout-title-gap);
	}

	.verdicts {
		display: flex;
		flex-direction: column;
		gap: var(--verdict-list-gap);
	}

	.verdict {
		display: flex;
		flex-direction: column;
	}

	dt {
		display: flex;
		gap: var(--verdict-label-gap);
		align-items: center;
		color: var(--verdict-label);
	}

	dt :global(svg) {
		color: var(--content-icon);
	}

	.type-verdict {
		margin-block: var(--verdict-gap) var(--verdict-meter-gap);
		color: var(--verdict-word);
	}
</style>
