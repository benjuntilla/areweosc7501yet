<script lang="ts">
	import type { Side } from '#lib/domain/overview.ts';
	import StateGlyph from './StateGlyph.svelte';

	let { side }: { side: Side } = $props();

	const pct = (n: number) => (n / side.featured) * 100;
</script>

<div class="meter">
	<div
		class="bar"
		role="img"
		aria-label="{side.done} of {side.featured} {side.name.toLowerCase()} done, {side.working} working"
		style:--done="{pct(side.done)}%"
		style:--working="{pct(side.working)}%"
	>
		<span class="fill ghost"></span>
		<span class="fill done"></span>
	</div>
	<p class="counts type-caption" aria-hidden="true">
		<span><StateGlyph state="done" size={12} />{side.done} of {side.featured} done</span>
		<span><StateGlyph state="working" size={12} />{side.working} working</span>
	</p>
</div>

<style>
	.meter {
		display: flex;
		flex-direction: column;
		gap: var(--space-14);
	}

	.bar {
		position: relative;
		height: 8px;
		overflow: hidden;
		border-radius: var(--meter-radius);
		background: var(--meter-track);
	}

	/* One gradient across the whole track, clipped to the done and working spans. */
	.fill {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			in oklab 90deg,
			var(--meter-gradient-lime) 0%,
			var(--meter-gradient-amber) 28%,
			var(--meter-gradient-orange) 50%,
			var(--meter-gradient-pink) 70%,
			var(--meter-gradient-lavender) 100%
		);
	}

	.done {
		clip-path: inset(0 calc(100% - var(--done)) 0 0);
	}

	.ghost {
		opacity: calc(var(--meter-ghost-opacity) / 100);
		clip-path: inset(0 calc(100% - var(--done) - var(--working)) 0 var(--done));
	}

	.counts {
		display: flex;
		gap: var(--meter-count-gap);
		color: var(--meter-count);
	}

	.counts span {
		display: flex;
		align-items: center;
		gap: var(--meter-count-item-gap);
	}
</style>
