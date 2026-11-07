<script lang="ts">
	import type { Attachment } from 'svelte/attachments';

	/** `tail` is the most characters that stay at the end. */
	let { text, tail = 20 }: { text: string; tail?: number } = $props();

	// Long text truncates in the middle, like Finder: the start shrinks, the end stays. The ellipsis
	// is a real character, so a link's underline runs under it.
	const fit: Attachment<HTMLElement> = (label) => {
		const end = text.slice(text.length - Math.min(tail, Math.floor(text.length / 2)));
		const start = text.slice(0, text.length - end.length);
		// Measured in fractional pixels: scrollWidth rounds, so it can miss a spill of under a pixel,
		// and any spill also shows the CSS ellipsis.
		const range = document.createRange();
		const width = () => {
			range.selectNodeContents(label);
			return range.getBoundingClientRect().width;
		};
		// The text cut to `kept` characters around the ellipsis. The end fills up first, so it shrinks
		// only when the start is gone and it still doesn't fit.
		const cut = (kept: number) =>
			kept <= end.length
				? `…${text.slice(text.length - kept)}`
				: `${start.slice(0, kept - end.length)}…${end}`;
		const update = () => {
			if (label.textContent !== text) label.textContent = text;
			// With the full text in, the label is as wide as it can get.
			const room = label.getBoundingClientRect().width;
			if (width() <= room) return;
			// The most characters that fit.
			let low = 0;
			let high = text.length - 1;
			while (low < high) {
				const mid = Math.ceil((low + high) / 2);
				label.textContent = cut(mid);
				if (width() <= room) low = mid;
				else high = mid - 1;
			}
			label.textContent = cut(low);
		};
		update();
		// The text gets wider or narrower when the web font replaces the fallback font.
		void document.fonts.ready.then(update);
		addEventListener('resize', update);
		return () => removeEventListener('resize', update);
	};
</script>

<span class="middle-ellipsis" {@attach fit}>{text}</span>

<style>
	/*
	 * Until the script runs, long text ends in the browser's own ellipsis.
	 * It clips only sideways, since Firefox and Safari cut a link underline below the line box.
	 * A clip isn't a scroll container, so the flex item needs a zero minimum size to shrink.
	 */
	.middle-ellipsis {
		display: block;
		min-inline-size: 0;
		overflow: clip visible;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
