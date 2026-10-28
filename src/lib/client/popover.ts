import { Effect } from 'effect';
import { forkScoped } from './fiber.ts';

const openDelay = 200;
const closeDelay = 150;

/**
 * Opens a moment after the pointer stops moving over the chip. Closes a moment after it leaves, so
 * it can cross the gap between chip and popover.
 */
export const hoverIntent = (popover: HTMLElement) => {
	let cancel: (() => void) | undefined;
	const later = (ms: number, f: () => void) => {
		cancel?.();
		cancel = forkScoped(Effect.delay(Effect.sync(f), `${ms} millis`));
	};
	return {
		enter: (event: PointerEvent) => {
			if (event.pointerType !== 'mouse') return;
			later(popover.matches(':popover-open') ? 0 : openDelay, () => {
				popover.showPopover();
			});
		},
		leave: (event: PointerEvent) => {
			if (event.pointerType !== 'mouse') return;
			later(closeDelay, () => {
				popover.hidePopover();
			});
		}
	};
};

/**
 * Places a popover under its chip where CSS anchor positioning isn't supported: left-aligned to
 * the chip, kept inside 16 px gutters, and above the chip when there's no room below.
 */
export const placeUnder = (popover: HTMLElement, chip: HTMLElement) => {
	if (CSS.supports('anchor-name: --x')) return;
	const gutter = 16;
	const gap = 8;
	const c = chip.getBoundingClientRect();
	const p = popover.getBoundingClientRect();
	const left = Math.min(Math.max(c.left, gutter), innerWidth - gutter - p.width);
	const below = c.bottom + gap;
	const top =
		below + p.height > innerHeight && c.top - gap - p.height > 0 ? c.top - gap - p.height : below;
	popover.style.left = `${Math.max(left, gutter)}px`;
	popover.style.top = `${top}px`;
};
