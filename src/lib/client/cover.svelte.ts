/**
 * The overview's top stays put while the content below slides over it. The page fills this in on
 * each scroll, so the parts outside the page can follow: the top bar stays and fades with the top,
 * and the rail shows a side's label once its verdict is covered.
 */
export const cover = $state<{
	/** What stays put: the whole top, only the title and verdicts, or nothing. */
	stays: 'top' | 'question' | undefined;
	/** The opacity of what stays put. It reaches 0 as the content covers the topmost part. */
	fade: number;
	/** The window y of the content's top edge. */
	edge: number;
	/** By side: whether the content covers its verdict, or the verdict has left the window. */
	covered: Record<string, boolean>;
}>({ stays: undefined, fade: 1, edge: Infinity, covered: {} });

/** Focus must never sit under the content, so this scrolls up until the part is clear of it. */
export const uncover = (part: Element) => {
	const overlap = part.getBoundingClientRect().bottom - cover.edge;
	if (overlap > 0) scrollBy({ top: -overlap, behavior: 'instant' });
};
