<script lang="ts">
	import { goto } from '$app/navigation';
	import { prefersReducedMotion } from '#lib/client/fiber.ts';
	import { loadSearch } from '#lib/client/search.ts';
	import { Number } from 'effect';
	import { tick } from 'svelte';
	import Icon from './Icon.svelte';
	import StateGlyph from './StateGlyph.svelte';

	let dialog: HTMLDialogElement | undefined = $state();
	let list: HTMLDivElement | undefined = $state();
	let trigger: HTMLElement | undefined;
	let find: Awaited<ReturnType<typeof loadSearch>> | undefined = $state();
	let query = $state('');
	let selected = $state(0);
	// The shadow stays off while the dialog morphs, then fades in once it has landed.
	let landing = $state(false);

	const q = $derived(query.trim());
	const groups = $derived(find === undefined || q === '' ? [] : find(q));
	const matches = $derived(groups.flatMap(([, items]) => items));
	const active = $derived(matches[selected]);
	const optionId = (slug: string) => `search-${slug}`;

	// The search button grows into the dialog and shrinks back into it. With reduced motion, on
	// touch screens, or without view transitions, the dialog just appears.
	const morph = async (from: HTMLElement, to: HTMLElement, swap: () => void) => {
		if (
			prefersReducedMotion() ||
			matchMedia('(pointer: coarse)').matches ||
			!('startViewTransition' in document)
		)
			return swap();
		from.style.viewTransitionName = 'search';
		await document.startViewTransition(() => {
			from.style.viewTransitionName = '';
			to.style.viewTransitionName = 'search';
			swap();
		}).finished;
		to.style.viewTransitionName = '';
	};

	// While the dialog is open, it stands in for the button that opened it.
	const showTrigger = () => {
		if (trigger === undefined) return;
		trigger.style.visibility = '';
		trigger.focus();
	};

	export const open = async (from: HTMLElement) => {
		const d = dialog;
		if (d === undefined || d.open) return;
		trigger = from;
		query = '';
		selected = 0;
		void loadSearch().then((f) => (find = f));
		landing = true;
		await tick();
		await morph(from, d, () => {
			from.style.visibility = 'hidden';
			d.style.setProperty('--scroll-y', `${scrollY}px`);
			d.showModal();
		});
		landing = false;
	};

	const close = async () => {
		const d = dialog;
		if (d === undefined || trigger === undefined) return;
		landing = true;
		await tick();
		await morph(d, trigger, () => {
			d.close();
			showTrigger();
		});
		landing = false;
	};

	// A chosen entry opens on the overview, which unfolds its category and opens its popover.
	const go = (slug: string) => {
		dialog?.close();
		void goto(`/#${slug}`);
	};

	const move = async (step: number) => {
		selected = Number.clamp(selected + step, { minimum: 0, maximum: matches.length - 1 });
		await tick();
		list?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
	};

	const onkeydown = (event: KeyboardEvent) => {
		const key = event.ctrlKey ? `Control+${event.key}` : event.key;
		if (key === 'ArrowDown' || key === 'Control+n') void move(1);
		else if (key === 'ArrowUp' || key === 'Control+p') void move(-1);
		else if (key === 'Enter' && active !== undefined) go(active.slug);
		else return;
		event.preventDefault();
	};
</script>

<dialog
	bind:this={dialog}
	class="search-dialog"
	data-landing={landing || undefined}
	aria-label="Search"
	oncancel={(event) => {
		event.preventDefault();
		void close();
	}}
	onclose={showTrigger}
	onclick={(event) => {
		if (event.target === dialog) void close();
	}}
>
	<div class="field">
		<Icon name="search" class="icon" />
		<input
			bind:value={query}
			oninput={() => (selected = 0)}
			{onkeydown}
			role="combobox"
			aria-label="Find a program"
			aria-autocomplete="list"
			aria-expanded={matches.length > 0}
			aria-controls={matches.length > 0 ? 'search-list' : undefined}
			aria-activedescendant={active === undefined ? undefined : optionId(active.slug)}
			placeholder="Find a program"
			autocomplete="off"
			spellcheck="false"
		/>
		<button class="esc" type="button" aria-label="Close search (esc)" onclick={() => void close()}
			>esc</button
		>
	</div>
	{#if matches.length > 0}
		<div bind:this={list} class="list" id="search-list" role="listbox" aria-label="Programs">
			{#each groups as [category, items], g (category)}
				<div role="group" aria-labelledby="search-group-{g}">
					<div class="heading type-caption" id="search-group-{g}">{category}</div>
					{#each items as match (match.slug)}
						<!-- Keys reach the options through the field, as the combobox pattern has it. -->
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div
							class="option"
							id={optionId(match.slug)}
							role="option"
							tabindex="-1"
							aria-selected={match === active}
							onpointermove={() => (selected = matches.indexOf(match))}
							onclick={() => go(match.slug)}
						>
							<StateGlyph state={match.state} />
							<span class="name type-small"
								>{#each match.parts as part, i (i)}{#if i % 2 === 1}<mark>{part}</mark
										>{:else}{part}{/if}{/each}</span
							>
							<span class="state">{match.state}</span>
							<span class="enter" aria-hidden="true">↵</span>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	{:else if find !== undefined && q !== ''}
		<p class="empty type-h3">Nothing matches “{q}”.</p>
	{/if}
	<p class="visually-hidden" role="status">
		{q === '' ? '' : `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`}
	</p>
</dialog>

<style>
	/* iOS places the caret by the page, and a fixed dialog can sit a little off from where the
	   page puts it, which leaves the caret above the field. So the dialog sits on the page, where
	   the window was when it opened, and the page holds still while it is open. */
	:global(:root:has(.search-dialog[open])) {
		overflow: hidden;
		scrollbar-gutter: stable;
	}

	.search-dialog {
		position: absolute;
		inset-block: calc(var(--scroll-y) + 12vb) auto;
		inline-size: min(var(--search-dialog-width), 100vi - 32px);
		max-inline-size: none;
		max-block-size: min(var(--search-dialog-max-height), 76vb);
		padding: 0;
		margin-block: 0 auto;
		overflow: hidden;
		color: var(--search-dialog-text);
		background: var(--search-dialog-background);
		border: 0;
		border-radius: var(--search-dialog-radius);
		box-shadow: var(--search-dialog-shadow);
		transition: box-shadow var(--motion-search-shadow-duration) ease-out;
	}

	.search-dialog[open] {
		display: flex;
		flex-direction: column;
	}

	.search-dialog[data-landing] {
		box-shadow: none;
		transition: none;
	}

	.search-dialog::backdrop {
		background: var(--search-dialog-backdrop);
	}

	.field {
		display: flex;
		flex-shrink: 0;
		gap: var(--search-dialog-input-gap);
		align-items: center;
		block-size: var(--search-dialog-input-height);
		padding-inline: var(--search-dialog-input-padding-x);
	}

	.field :global(.icon) {
		inline-size: var(--search-dialog-icon-size);
		block-size: var(--search-dialog-icon-size);
		color: var(--search-dialog-icon);
	}

	input {
		flex: 1;
		min-inline-size: 0;
		padding: 0;
		font-size: var(--search-dialog-input-size);
		letter-spacing: var(--search-dialog-input-tracking);
		caret-color: var(--search-dialog-caret);
		outline: none;
		background: none;
		border: 0;
	}

	input::placeholder {
		color: var(--search-dialog-placeholder);
		opacity: 1;
	}

	.esc {
		font-size: var(--search-dialog-esc-size);
		color: var(--search-dialog-meta);
	}

	.list {
		padding: 0 var(--search-dialog-results-padding) var(--search-dialog-results-padding);
		/* stylelint-disable-next-line property-layout-mappings -- overflow-block needs Safari 26 */
		overflow-y: auto;
		/* stylelint-disable-next-line plugin/use-baseline -- where it is missing, the page behind scrolls along with the list */
		overscroll-behavior: contain;
	}

	.heading {
		padding: var(--search-dialog-heading-padding-top) var(--search-dialog-item-padding-x)
			var(--search-dialog-heading-padding-bottom);
		color: var(--search-dialog-meta);
	}

	.option {
		display: flex;
		gap: var(--search-dialog-item-gap);
		align-items: center;
		padding: var(--search-dialog-item-padding-y) var(--search-dialog-item-padding-x);
		cursor: pointer;
		border-radius: var(--search-dialog-item-radius);
	}

	.option[aria-selected='true'] {
		background: var(--search-dialog-selected);
	}

	.name {
		flex: 1;
		min-inline-size: 0;
	}

	mark {
		padding-inline: var(--search-dialog-mark-bleed);
		margin-inline: calc(var(--search-dialog-mark-bleed) * -1);
		color: inherit;
		background: var(--search-dialog-mark);
		border-radius: var(--search-dialog-mark-radius);
	}

	.state,
	.enter {
		font-size: var(--search-dialog-state-size);
		line-height: var(--search-dialog-state-line-height);
		color: var(--search-dialog-meta);
	}

	.enter {
		visibility: hidden;
	}

	.option[aria-selected='true'] .enter {
		visibility: visible;
	}

	.empty {
		padding: var(--search-dialog-empty-padding-top) var(--search-dialog-input-padding-x)
			var(--search-dialog-empty-padding-bottom);
	}

	/* The button and the dialog trade places: their snapshots stay unscaled at the top left while
	   the box between them grows or shrinks, and the page and the backdrop cross-fade. */
	:global(::view-transition-group(search)) {
		overflow: clip;
		border-radius: var(--search-dialog-radius);
		animation-duration: var(--motion-search-morph-duration);
		animation-timing-function: var(--motion-ease-morph);
	}

	:global(::view-transition-old(search)),
	:global(::view-transition-new(search)) {
		block-size: 100%;
		object-fit: none;
		object-position: left top;
		animation-duration: var(--motion-search-morph-duration);
	}

	:global(::view-transition-old(root)),
	:global(::view-transition-new(root)) {
		animation-duration: var(--motion-search-morph-duration);
	}
</style>
