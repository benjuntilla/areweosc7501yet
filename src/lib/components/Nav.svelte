<script lang="ts">
	import { page } from '$app/state';
	import { search } from '#lib/client/search.svelte.ts';
	import type { Side } from '#lib/domain/overview.ts';
	import Icon from './Icon.svelte';

	interface Props {
		sides: ReadonlyArray<Side>;
		current?: string | undefined;
		autofocus?: boolean;
		onnavigate?: () => void;
	}

	let { sides, current, autofocus = false, onnavigate }: Props = $props();

	const about = [
		{ href: '/test', label: 'Test your terminal' },
		{ href: '/methodology', label: 'Methodology' },
		{ href: '/contribute', label: 'Contribute' }
	];
	const resources = [
		{ href: '/changes', label: 'Changes' },
		{ href: '/feed.xml', label: 'Atom feed', reload: true },
		{ href: '/data.json', label: 'Data as JSON', reload: true },
		{ href: 'https://github.com/benjuntilla/areweosc7501yet', label: 'GitHub ↗', reload: true }
	];

	// A section link clears the search, so the section it points to is on the page.
	const toSection = () => {
		search.query = '';
		onnavigate?.();
	};

	const here = (href: string) => (page.url.pathname === href ? 'page' : undefined);
	const at = (id: string) => (page.url.pathname === '/' && current === id ? 'location' : undefined);
</script>

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
							aria-current={at(side.id)}
							onclick={toSection}
						>
							<Icon name={side.role} size={12} />{side.name}
						</a>
						<ul class="toc">
							{#each side.categories as category (category.id)}
								<li>
									<a
										class="toc-link"
										href="/#{category.id}"
										aria-current={at(category.id)}
										onclick={toSection}>{category.name}</a
									>
								</li>
							{/each}
						</ul>
					</li>
				{/each}
			</ul>
		</li>
	</ul>
	<p class="group" id="nav-about">About</p>
	<ul aria-labelledby="nav-about">
		{#each about as link (link.href)}
			<li>
				<a class="item" href={link.href} aria-current={here(link.href)} onclick={onnavigate}
					>{link.label}</a
				>
			</li>
		{/each}
	</ul>
	<p class="group" id="nav-resources">Resources</p>
	<ul aria-labelledby="nav-resources">
		{#each resources as link (link.href)}
			<li>
				<a
					class="item"
					href={link.href}
					aria-current={here(link.href)}
					data-sveltekit-reload={link.reload ? '' : undefined}
					onclick={onnavigate}>{link.label}</a
				>
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
		width: 100%;
	}

	.item {
		display: inline-block;
		padding: var(--nav-item-padding-y) var(--nav-item-padding-x);
		border-radius: var(--nav-item-radius);
		color: var(--nav-item);
		font-size: var(--type-nav-size);
		line-height: var(--type-nav-line-height);
		text-decoration: none;
		transition:
			color var(--motion-state-duration) var(--motion-ease-state),
			background-color var(--motion-state-duration) var(--motion-ease-state);
	}

	.item:hover {
		background: var(--nav-item-background-hover);
		color: var(--nav-item-hover);
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
		color: var(--nav-group-label);
		font-size: var(--type-nav-size);
		line-height: var(--type-nav-line-height);
	}

	.toc {
		padding-bottom: 4px;
		padding-left: var(--nav-item-padding-x);
	}

	.toc .toc {
		padding-left: 0;
	}

	.toc > li {
		position: relative;
		padding-left: var(--nav-toc-indent);
	}

	.toc > li::before {
		content: '';
		position: absolute;
		left: 4px;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--nav-toc-guide);
	}

	.toc > li:last-child::before {
		bottom: auto;
		height: 12px;
	}

	.toc > li::after {
		content: '';
		position: absolute;
		left: 4px;
		top: 12px;
		width: 8px;
		height: 1px;
		background: var(--nav-toc-guide);
	}

	.toc-link {
		display: flex;
		align-items: center;
		gap: var(--nav-group-gap);
		padding: var(--nav-toc-item-padding-y) 0;
		color: var(--nav-item);
		font-size: 13px;
		line-height: 16px;
		text-decoration: none;
		transition: color 100ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.toc-link:hover {
		color: var(--nav-item-hover);
	}

	.side :global(svg) {
		color: var(--content-icon);
	}
</style>
