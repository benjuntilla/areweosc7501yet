<script lang="ts">
	import type { RoleView } from '#lib/domain/overview.ts';
	import Category from './Category.svelte';
	import Icon from './Icon.svelte';

	interface Props {
		role: RoleView;
		query: string;
		expanded: Record<string, boolean>;
		highlight: string | undefined;
	}

	let { role, query, expanded = $bindable(), highlight }: Props = $props();
</script>

<section class="role" id={role.id} aria-labelledby="{role.id}-head">
	<h3 class="type-h2" id="{role.id}-head"><Icon name={role.role} size={16} />{role.name}</h3>
	{#each role.categories as category (category.id)}
		<Category
			{category}
			{query}
			bind:expanded={() => expanded[category.id] ?? false, (v) => (expanded[category.id] = v)}
			{highlight}
		/>
	{/each}
</section>

<style>
	.role {
		display: flex;
		flex-direction: column;
		gap: var(--space-28);
	}

	h3 {
		display: flex;
		align-items: baseline;
		gap: var(--space-8);
	}

	h3 :global(svg) {
		align-self: center;
		color: var(--heading-icon);
	}
</style>
