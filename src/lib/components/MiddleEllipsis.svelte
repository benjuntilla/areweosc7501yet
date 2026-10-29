<script lang="ts">
	/** `tail` is the most characters that stay at the end. */
	let { text, tail = 20 }: { text: string; tail?: number } = $props();

	// Long text truncates in the middle, like Finder: the start shrinks, the end stays.
	const end = $derived(Math.min(tail, Math.floor(text.length / 2)));
</script>

<span class="middle-ellipsis"
	><span class="start">{text.slice(0, text.length - end)}</span><span class="end"
		>{text.slice(text.length - end)}</span
	></span
>

<style>
	.middle-ellipsis {
		display: flex;
		min-inline-size: 0;
		white-space: nowrap;
	}

	.start,
	.end {
		white-space: pre;
	}

	.start {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.end {
		flex-shrink: 0;
	}
</style>
