<script lang="ts">
	import { hoverIntent, placeUnder } from '#lib/client/popover.ts';
	import type { Chip } from '#lib/domain/overview.ts';
	import MiddleEllipsis from './MiddleEllipsis.svelte';
	import StateGlyph from './StateGlyph.svelte';

	let { chip, highlight = false }: { chip: Chip; highlight?: boolean } = $props();

	let button: HTMLButtonElement | undefined = $state();
	let popover: HTMLDivElement | undefined = $state();
	let link: HTMLAnchorElement | undefined = $state();
	let open = $state(false);

	// Hover opens the popover once the pointer rests on the chip. It waits for the pointer to move,
	// so a chip that scrolls under a still pointer, as on a jump to an entry, leaves it alone.
	const intent = $derived(popover ? hoverIntent(popover) : undefined);

	const ontoggle = (event: ToggleEvent) => {
		open = event.newState === 'open';
		if (open && popover && button) placeUnder(popover, button);
	};

	// Keyboard focus opens the popover; Enter or Space moves into it.
	const onfocus = () => {
		if (button?.matches(':focus-visible')) popover?.showPopover();
	};

	const onkeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		popover?.showPopover();
		link?.focus();
	};

	// A mouse click on an open popover keeps it open; touch toggles it natively. The pointer type
	// comes from the press, because iOS Safari reports a tap's click as a mouse click. A click with
	// no press, as from a screen reader, toggles.
	let pointerType = '';

	const onclick = (event: MouseEvent) => {
		if (pointerType === 'mouse' && open) event.preventDefault();
		pointerType = '';
	};

	// Tabbing past the chip and its popover closes it.
	const onfocusout = (event: FocusEvent) => {
		const next = event.relatedTarget;
		if (next instanceof Node && (button?.contains(next) || popover?.contains(next))) return;
		if (next !== null) popover?.hidePopover();
	};
</script>

<li class="chip-item" style:anchor-name="--chip-{chip.slug}">
	<button
		bind:this={button}
		id={chip.slug}
		class="chip type-small"
		class:muted={chip.state === 'idle' || chip.state === 'error'}
		class:highlight
		type="button"
		popovertarget="popover-{chip.slug}"
		aria-haspopup="dialog"
		aria-expanded={open}
		aria-label="{chip.name}, {chip.state}"
		onpointerdown={(e) => (pointerType = e.pointerType)}
		onpointermove={(e) => intent?.enter(e)}
		onpointerleave={(e) => intent?.leave(e)}
		{onfocus}
		{onkeydown}
		{onclick}
		{onfocusout}
	>
		<StateGlyph state={chip.state} />
		<MiddleEllipsis text={chip.name} />
	</button>
	<div
		bind:this={popover}
		id="popover-{chip.slug}"
		class="popover"
		style:position-anchor="--chip-{chip.slug}"
		popover="auto"
		role="dialog"
		tabindex="-1"
		aria-labelledby="popover-{chip.slug}-name"
		onpointerenter={(e) => intent?.enter(e)}
		onpointerleave={(e) => intent?.leave(e)}
		{ontoggle}
		{onfocusout}
	>
		<div class="head">
			<StateGlyph state={chip.state} />
			<p class="title type-small" id="popover-{chip.slug}-name">
				<a bind:this={link} href={chip.url}>{chip.name}</a>
			</p>
			<p
				class="state type-caption"
				style:--state-color="var(--status-{chip.state === 'working' ? 'working-text' : chip.state})"
			>
				{chip.state}
			</p>
		</div>
		<p class="body type-small">{chip.sentence}</p>
		{#if chip.note}
			<p class="body type-small">Note: {chip.note}</p>
		{/if}
		<div class="meta type-caption">
			{#if chip.source}
				<a href={chip.source}>{chip.sourceLabel}</a>
			{/if}
			<p>spec {chip.specRevision} · checked {chip.checked}</p>
		</div>
	</div>
</li>

<style>
	.chip {
		display: flex;
		gap: var(--chip-gap);
		align-items: center;
		max-inline-size: var(--chip-max-width);
		padding: var(--chip-padding-y) var(--chip-padding-right) var(--chip-padding-y)
			var(--chip-padding-left);
		color: var(--chip-label);
		text-align: start;
		border-radius: var(--chip-radius);
		transition: background-color var(--motion-state-duration) var(--motion-ease-state);
	}

	.chip.muted {
		color: var(--chip-label-muted);
	}

	.chip:hover,
	.chip[aria-expanded='true'] {
		background: var(--chip-background-hover);
	}

	.chip:active {
		background: var(--chip-background-pressed);
	}

	.highlight {
		animation: highlight var(--motion-chip-highlight-duration) var(--motion-ease-state);
	}

	@keyframes highlight {
		0%,
		40% {
			background: var(--chip-background-pressed);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.highlight {
			animation: none;
		}
	}

	/* The layout lives here, not under :popover-open, so the popover keeps its shape while it fades out. */
	.popover {
		flex-direction: column;
		gap: var(--popover-gap);
		inline-size: min(var(--popover-width), 100vi - var(--layout-page-padding-x) * 2);
		padding: var(--popover-padding-y) var(--popover-padding-x);
		margin: 0;
		color: var(--popover-body);
		background: var(--popover-background);
		border: 0;
		border-radius: var(--popover-radius);
		box-shadow: var(--popover-shadow);
		opacity: 0;
		transition:
			opacity var(--motion-state-duration) ease-out,
			display var(--motion-state-duration) allow-discrete,
			overlay var(--motion-state-duration) allow-discrete;
	}

	.popover:popover-open {
		display: flex;
		opacity: 1;
	}

	@starting-style {
		.popover:popover-open {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.popover {
			transition: none;
		}
	}

	/* The popover lines up with an edge of its chip. The margin on its far side keeps it inside the
	   page padding: where neither edge leaves room, as on phones, it centers on the chip instead. */
	@supports (anchor-name: --x) {
		.popover {
			margin-block: var(--popover-offset);
			margin-inline: 0 var(--layout-page-padding-x);
			position-area: block-end span-inline-end;
			position-try-fallbacks:
				flip-block,
				flip-inline,
				flip-block flip-inline,
				--centered-below,
				--centered-above;
		}
	}

	@position-try --centered-below {
		margin-inline: var(--layout-page-padding-x);
		position-area: block-end span-all;
	}

	@position-try --centered-above {
		margin-inline: var(--layout-page-padding-x);
		position-area: block-start span-all;
	}

	.head {
		display: flex;
		gap: var(--popover-gap);
		align-items: center;
	}

	.title {
		flex: 1;
		color: var(--popover-title);
	}

	.state {
		color: var(--state-color);
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: var(--popover-meta-gap);
		color: var(--popover-meta);
	}

	.title a,
	.meta a {
		color: inherit;
	}

	.title a:hover,
	.meta a:hover {
		color: var(--link-text-hover);
	}

	.title a:active {
		color: var(--link-text-pressed);
	}
</style>
