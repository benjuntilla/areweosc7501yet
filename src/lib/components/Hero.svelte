<script lang="ts">
	import Drum from './Drum.svelte';

	let { element = $bindable() }: { element?: HTMLElement | undefined } = $props();
</script>

<section class="hero" aria-labelledby="about" bind:this={element}>
	<h2 class="type-section" id="about">What’s that?</h2>
	<div class="drum-line">
		<p class="type-lead">
			Programs can finally tell your terminal:<span class="visually-hidden">
				error, idle, working, blocked or done.</span
			>
		</p>
		<div class="drum-slot"><Drum /></div>
	</div>
	<p>
		OSC 7501, the Program Status Protocol, is a new standard to let programs communicate status to
		your terminal, whether they’re working, waiting on you, done, or failed. Learn more from <a
			href="https://mitchellh.com/writing/program-status-osc7501">Mitchell’s announcement</a
		>
		and <a href="https://www.superlogical.com/rex/docs/build/program-status">the spec</a>.
	</p>
</section>

<style>
	.hero {
		display: flex;
		flex-direction: column;
		gap: var(--layout-hero-gap);
	}

	.drum-line {
		display: flex;
		flex-wrap: wrap;
		column-gap: var(--hero-drum-gap);
		align-items: center;
		margin-block-end: var(--hero-drum-margin-bottom);
	}

	.type-lead {
		color: var(--content-text);
	}

	.drum-slot {
		block-size: var(--hero-drum-height);
	}

	a {
		color: var(--content-text-strong);
	}
</style>
