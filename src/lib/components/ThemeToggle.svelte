<script lang="ts">
	import { applyTheme, choice, readTheme, type Theme, themes } from '#lib/client/theme.svelte.ts';
	import { Effect } from 'effect';
	import { onMount } from 'svelte';

	const buttons: Array<HTMLButtonElement> = [];
	const labels: Record<Theme, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };

	onMount(() => {
		choice.theme = Effect.runSync(readTheme);
	});

	const choose = (theme: Theme, focus = false) => {
		choice.theme = theme;
		Effect.runSync(applyTheme(theme));
		if (focus) buttons[themes.indexOf(theme)]?.focus();
	};

	// One tab stop; the arrow keys move between the options, as in a native radio group.
	const onkeydown = (event: KeyboardEvent) => {
		const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
		if (step === undefined) return;
		event.preventDefault();
		const next = themes[(themes.indexOf(choice.theme) + step + themes.length) % themes.length];
		if (next !== undefined) choose(next, true);
	};
</script>

<div
	class="theme-toggle type-caption"
	role="radiogroup"
	aria-label="Theme"
	tabindex="-1"
	{onkeydown}
>
	{#each themes as theme, i (theme)}
		<button
			bind:this={buttons[i]}
			type="button"
			role="radio"
			aria-checked={choice.theme === theme}
			tabindex={choice.theme === theme ? 0 : -1}
			onclick={() => choose(theme)}>{labels[theme]}</button
		>
	{/each}
</div>

<style>
	.theme-toggle {
		display: inline-flex;
		gap: var(--theme-toggle-gap);
		padding: var(--theme-toggle-padding);
		background: var(--theme-toggle-track);
		border-radius: var(--theme-toggle-radius);
	}

	:global(html:not(.js)) .theme-toggle {
		display: none;
	}

	button {
		padding: var(--theme-toggle-padding) var(--theme-toggle-option-padding-x);
		color: var(--theme-toggle-label);
		border-radius: var(--theme-toggle-option-radius);
		transition:
			color var(--motion-state-duration) var(--motion-ease-state),
			background-color var(--motion-state-duration) var(--motion-ease-state);
	}

	button:hover {
		color: var(--theme-toggle-label-active);
	}

	[aria-checked='true'] {
		color: var(--theme-toggle-label-active);
		background: var(--theme-toggle-thumb);
		box-shadow:
			0 2px 2px -1px var(--theme-toggle-thumb-shadow),
			0 1px 1px -0.5px var(--theme-toggle-thumb-shadow),
			0 0 0 0.5px var(--theme-toggle-thumb-ring);
	}
</style>
