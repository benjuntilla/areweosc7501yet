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
		const update = () => {
			if (label.textContent !== text) label.textContent = text;
			// With the full text in, the label is as wide as it can get.
			const room = label.getBoundingClientRect().width;
			if (width() <= room) return;
			// The longest start that fits next to the ellipsis and the end.
			let low = 0;
			let high = start.length - 1;
			while (low < high) {
				const mid = Math.ceil((low + high) / 2);
				label.textContent = `${start.slice(0, mid)}…${end}`;
				if (width() <= room) low = mid;
				else high = mid - 1;
			}
			label.textContent = `${start.slice(0, low)}…${end}`;
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
	/* Until the script runs, long text ends in the browser's own ellipsis. */
	.middle-ellipsis {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
