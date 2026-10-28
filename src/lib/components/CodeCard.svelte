<script lang="ts">
	import { Effect } from 'effect';
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		/** What the snippet is: a file path or the shell it runs in. */
		label: string;
		code: string;
		/** The snippet highlighted at build, from highlight.ts. */
		html: string;
	}

	let { label, code, html }: Props = $props();

	// The button needs the clipboard API, so it shows only once the page has scripts.
	let scripted = $state(false);
	let result: 'copied' | 'failed' | undefined = $state();
	onMount(() => {
		scripted = true;
	});

	// Each click interrupts the previous click's feedback, so only the latest one sets and clears it.
	let interruptPrevious: (() => void) | undefined;
	const copy = () => {
		interruptPrevious?.();
		// The status empties first, so screen readers announce a repeated result again.
		result = undefined;
		interruptPrevious = Effect.runCallback(
			Effect.gen(function* () {
				result = yield* Effect.tryPromise(() => navigator.clipboard.writeText(code)).pipe(
					Effect.as('copied' as const),
					Effect.orElseSucceed(() => 'failed' as const)
				);
				yield* Effect.sleep('1500 millis');
				result = undefined;
			})
		);
	};
</script>

<figure class="card type-code">
	<figcaption class="head">
		<span class="label">{label}</span>
		<button class="copy" type="button" hidden={!scripted} aria-label="Copy code" onclick={copy}>
			<Icon name={result === 'copied' ? 'check' : result === 'failed' ? 'close' : 'copy'} />
		</button>
	</figcaption>
	{@html html}
	<span class="visually-hidden" role="status">
		{result === 'copied' ? 'Copied' : result === 'failed' ? 'Copy failed' : ''}
	</span>
</figure>

<style>
	.card {
		overflow: hidden;
		background: var(--card-background);
		border-radius: var(--card-radius);
		box-shadow: var(--card-shadow);
	}

	.head {
		display: flex;
		gap: var(--code-block-head-gap);
		align-items: center;
		padding: var(--code-block-head-padding-y) var(--code-block-head-padding-right)
			var(--code-block-head-padding-y) var(--code-block-padding-x);
		border-block-end: var(--content-divider-width) solid var(--content-divider);
	}

	.label {
		flex: 1;
		min-inline-size: 0;
		color: var(--content-text-muted);
	}

	.copy {
		display: grid;
		place-items: center;
		padding: var(--code-block-button-padding);
		margin: calc(var(--code-block-button-padding) * -1);
		color: var(--content-icon);
		border-radius: var(--code-block-button-radius);
		transition: color var(--motion-state-duration) var(--motion-ease-state);
	}

	.copy[hidden] {
		display: none;
	}

	.copy:hover {
		color: var(--content-icon-strong);
	}

	/* Code never wraps: long lines scroll sideways inside the card. */
	.card :global(pre) {
		padding: var(--code-block-padding-top) var(--code-block-padding-x)
			var(--code-block-padding-bottom);
		margin: 0;
		/* stylelint-disable-next-line property-layout-mappings -- overflow-inline needs Safari 26 */
		overflow-x: auto;
		font: inherit;
		white-space: pre;
	}
</style>
