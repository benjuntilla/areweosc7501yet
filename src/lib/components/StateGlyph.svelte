<script lang="ts">
	import type { State } from '#lib/domain/schema.ts';

	interface Props {
		state: State;
		size?: number;
		spin?: boolean;
		class?: string;
	}

	let { state, size = 14, spin = true, class: className = '' }: Props = $props();
</script>

<svg
	class="state-glyph {className}"
	class:spin
	style:--glyph-color="var(--status-{state})"
	width={size}
	height={size}
	viewBox="0 0 14 14"
	fill="none"
	aria-hidden="true"
	focusable="false"
>
	{#if state === 'done'}
		<path
			d="M3.25 7.25L5.75 9.75L10.75 4.25"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{:else if state === 'working'}
		<path
			class="dot"
			style:--i={0}
			d="M5 4.6C5.74558 4.6 6.35 3.99558 6.35 3.25C6.35 2.50442 5.74558 1.9 5 1.9C4.25442 1.9 3.65 2.50442 3.65 3.25C3.65 3.99558 4.25442 4.6 5 4.6Z"
			fill="currentColor"
		/>
		<path
			class="dot"
			style:--i={1}
			d="M9 4.6C9.74558 4.6 10.35 3.99558 10.35 3.25C10.35 2.50442 9.74558 1.9 9 1.9C8.25442 1.9 7.65 2.50442 7.65 3.25C7.65 3.99558 8.25442 4.6 9 4.6Z"
			fill="currentColor"
		/>
		<path
			class="dot"
			style:--i={5}
			d="M5 8.35C5.74558 8.35 6.35 7.74558 6.35 7C6.35 6.25442 5.74558 5.65 5 5.65C4.25442 5.65 3.65 6.25442 3.65 7C3.65 7.74558 4.25442 8.35 5 8.35Z"
			fill="currentColor"
		/>
		<path
			class="dot"
			style:--i={2}
			d="M9 8.35C9.74558 8.35 10.35 7.74558 10.35 7C10.35 6.25442 9.74558 5.65 9 5.65C8.25442 5.65 7.65 6.25442 7.65 7C7.65 7.74558 8.25442 8.35 9 8.35Z"
			fill="currentColor"
		/>
		<path
			class="dot"
			style:--i={4}
			d="M5 12.1C5.74558 12.1 6.35 11.4956 6.35 10.75C6.35 10.0044 5.74558 9.4 5 9.4C4.25442 9.4 3.65 10.0044 3.65 10.75C3.65 11.4956 4.25442 12.1 5 12.1Z"
			fill="currentColor"
		/>
		<path
			class="dot"
			style:--i={3}
			d="M9 12.1C9.74558 12.1 10.35 11.4956 10.35 10.75C10.35 10.0044 9.74558 9.4 9 9.4C8.25442 9.4 7.65 10.0044 7.65 10.75C7.65 11.4956 8.25442 12.1 9 12.1Z"
			fill="currentColor"
		/>
	{:else if state === 'blocked'}
		<path
			d="M6 4.5C6 3.94772 5.55228 3.5 5 3.5C4.44772 3.5 4 3.94772 4 4.5V9.5C4 10.0523 4.44772 10.5 5 10.5C5.55228 10.5 6 10.0523 6 9.5V4.5Z"
			fill="currentColor"
		/>
		<path
			d="M10 4.5C10 3.94772 9.55228 3.5 9 3.5C8.44772 3.5 8 3.94772 8 4.5V9.5C8 10.0523 8.44772 10.5 9 10.5C9.55228 10.5 10 10.0523 10 9.5V4.5Z"
			fill="currentColor"
		/>
	{:else if state === 'idle'}
		<path
			d="M10.75 7C10.75 9.07107 9.07107 10.75 7 10.75C4.92893 10.75 3.25 9.07107 3.25 7C3.25 4.92893 4.92893 3.25 7 3.25C9.07107 3.25 10.75 4.92893 10.75 7Z"
			stroke="currentColor"
			stroke-width="1.5"
		/>
	{:else}
		<path
			d="M4.25 4.25L7 7M7 7L9.75 9.75M7 7L9.75 4.25M7 7L4.25 9.75"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
		/>
	{/if}
</svg>

<style>
	.state-glyph {
		color: var(--glyph-color);
	}

	/* The still frame lights the top left, top right and middle left dots. */
	.dot {
		opacity: calc(var(--state-glyph-icon-opacity) / 100);
	}

	.dot:nth-child(-n + 3) {
		opacity: 1;
	}

	@media (prefers-reduced-motion: no-preference) {
		.spin .dot {
			animation: spin 1200ms ease-in-out infinite;
			animation-delay: calc(var(--i) * 200ms - 1200ms);
		}
	}

	/* Each dot brightens for half the loop and dims for the other half, so about three dots are lit. */
	@keyframes spin {
		0%,
		100% {
			opacity: calc(var(--state-glyph-icon-opacity) / 100);
		}

		50% {
			opacity: 1;
		}
	}
</style>
