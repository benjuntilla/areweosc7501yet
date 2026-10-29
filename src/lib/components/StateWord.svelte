<script lang="ts">
	import type { State } from '#lib/domain/schema.ts';
	import StateGlyph from './StateGlyph.svelte';

	let { state }: { state: State } = $props();
</script>

<span class="state-inline"><StateGlyph {state} />{state}</span>
