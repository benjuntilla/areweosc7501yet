<script lang="ts">
	import { page } from '$app/state';
	import type { Side } from '#lib/domain/overview.ts';
	import { tocs } from '#lib/toc.ts';
	import Icon from './Icon.svelte';
	import StateGlyph from './StateGlyph.svelte';

	interface Props {
		sides: ReadonlyArray<Side>;
		current?: string | undefined;
		autofocus?: boolean;
		onnavigate?: () => void;
	}

	let { sides, current, autofocus = false, onnavigate }: Props = $props();
	// The sidebar and the phone menu each render a nav, so its ids need a per-instance prefix.
	const uid = $props.id();

	const about = [
		{ href: '/test', label: 'Test your terminal' },
		{ href: '/methodology', label: 'Methodology' },
		{ href: '/contribute', label: 'Contribute' }
	];
	const resources = [
		{ href: '/changes', label: 'Changes' },
		{ href: '/feed.xml', label: 'Atom feed', reload: true },
		{ href: '/data.json', label: 'Data as JSON', reload: true },
		{ href: 'https://github.com/benjuntilla/areweosc7501yet', label: 'GitHub', reload: true }
	];

	const here = (href: string) => (page.url.pathname === href ? 'page' : undefined);
	const at = (path: string, id: string) =>
		page.url.pathname === path && current === id ? 'location' : undefined;
</script>

{#snippet toc(path: string)}
	{@const entries = tocs[path]}
	{#if entries}
		<!-- Only the current page's sections unfold; the others fold away and leave the tab order. -->
		<div class="unfold" class:open={here(path)} inert={!here(path)}>
			<ul class="toc">
				{#each entries as entry (entry.id)}
					<li>
						<a
							class="toc-link"
							href="{path}#{entry.id}"
							aria-current={at(path, entry.id)}
							onclick={onnavigate}
						>
							{#if entry.state}<StateGlyph state={entry.state} size={12} />{/if}{entry.label}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
{/snippet}

<nav class="nav" aria-label="Sections">
	<ul>
		<li>
			<!-- svelte-ignore a11y_autofocus -->
			<a class="item" href="/" aria-current={here('/')} {autofocus} onclick={onnavigate}>Overview</a
			>
			<ul class="toc">
				{#each sides as side (side.id)}
					<li>
						<a
							class="toc-link side"
							href="/#{side.id}"
							aria-current={at('/', side.id)}
							onclick={onnavigate}
						>
							<Icon name={side.role} size={12} />{side.name}
						</a>
						<ul class="toc">
							{#each side.categories as category (category.id)}
								<li>
									<a
										class="toc-link"
										href="/#{category.id}"
										aria-current={at('/', category.id)}
										onclick={onnavigate}>{category.name}</a
									>
								</li>
							{/each}
						</ul>
					</li>
				{/each}
			</ul>
		</li>
	</ul>
	<p class="group" id="{uid}-about">About</p>
	<ul aria-labelledby="{uid}-about">
		{#each about as link (link.href)}
			<li>
				<a class="item" href={link.href} aria-current={here(link.href)} onclick={onnavigate}
					>{link.label}</a
				>
				{@render toc(link.href)}
			</li>
		{/each}
	</ul>
	<p class="group" id="{uid}-resources">Resources</p>
	<ul aria-labelledby="{uid}-resources">
		{#each resources as link (link.href)}
			<li>
				<a
					class="item"
					href={link.href}
					aria-current={here(link.href)}
					data-sveltekit-reload={link.reload ? '' : undefined}
					onclick={onnavigate}>{link.label}</a
				>
				{@render toc(link.href)}
			</li>
		{/each}
	</ul>
</nav>

<style>
	.nav {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.nav > ul {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		inline-size: 100%;
	}

	.item {
		display: inline-block;
		padding: var(--nav-item-padding-y) var(--nav-item-padding-x);
		font-size: var(--type-nav-size);
		line-height: var(--type-nav-line-height);
		color: var(--nav-item);
		text-decoration: none;
		border-radius: var(--nav-item-radius);
		transition: var(--transition-state);
	}

	.item:hover {
		color: var(--nav-item-hover);
		background: var(--nav-item-background-hover);
	}

	.item:active {
		background: var(--nav-item-background-pressed);
	}

	.item[aria-current='page'] {
		color: var(--nav-item-active);
	}

	.group {
		padding: var(--nav-group-padding-top) 0 var(--nav-group-padding-bottom)
			var(--nav-item-padding-x);
		font-size: var(--type-nav-size);
		line-height: var(--type-nav-line-height);
		color: var(--nav-group-label);
	}

	.toc {
		padding-block-end: var(--nav-toc-padding-bottom);
		padding-inline-start: var(--nav-item-padding-x);
	}

	.toc .toc {
		padding-inline-start: 0;
	}

	.toc > li {
		position: relative;
		padding-inline-start: var(--nav-toc-indent);
	}

	.toc > li::before {
		position: absolute;
		inset-block: 0;
		inset-inline-start: 4px;
		inline-size: 1px;
		content: '';
		background: var(--nav-toc-guide);
	}

	.toc > li:last-child::before {
		inset-block-end: auto;
		block-size: 12px;
	}

	.toc > li::after {
		position: absolute;
		inset-block-start: 12px;
		inset-inline-start: 4px;
		inline-size: 8px;
		block-size: 1px;
		content: '';
		background: var(--nav-toc-guide);
	}

	.toc-link {
		display: flex;
		gap: var(--nav-group-gap);
		align-items: center;
		padding: var(--nav-toc-item-padding-y) 0;
		font-size: var(--nav-toc-size);
		line-height: var(--nav-toc-line-height);
		color: var(--nav-item);
		text-decoration: none;
		transition: color 100ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.toc-link:hover {
		color: var(--nav-item-hover);
	}

	.unfold {
		display: grid;
		grid-template-rows: 0fr;
		opacity: 0;
		transition:
			grid-template-rows var(--motion-toc-unfold-duration) var(--motion-ease-unfold),
			opacity var(--motion-toc-unfold-duration) var(--motion-ease-unfold);
	}

	.unfold.open {
		grid-template-rows: 1fr;
		opacity: 1;
	}

	.unfold > .toc {
		min-block-size: 0;
		overflow: hidden;
	}

	/* A 0fr row still shows its item's padding, so a folded list drops it. */
	.unfold:not(.open) > .toc {
		padding-block-end: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.unfold {
			transition: none;
		}
	}

	.side :global(svg) {
		color: var(--content-icon);
	}
</style>
