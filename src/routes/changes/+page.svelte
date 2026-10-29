<script lang="ts">
	import { siteTitle } from '#lib/meta.ts';
	import MiddleEllipsis from '#lib/components/MiddleEllipsis.svelte';
	import StateGlyph from '#lib/components/StateGlyph.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Changes · {siteTitle}</title>
	<meta
		name="description"
		content="Every OSC 7501 state change for a featured program or terminal, newest first."
	/>
</svelte:head>

<article class="page">
	<div class="page-head">
		<h1 class="type-h1">Changes</h1>
		<p>
			Every state change for a featured entry, newest first. Dates are in UTC. Follow along with the
			<a href="/feed.xml" data-sveltekit-reload>Atom feed</a>.
		</p>
	</div>

	{#each data.weeks as week (week.id)}
		<section class="week" aria-labelledby={week.id}>
			<h2 class="type-h2" id={week.id}>{week.label}</h2>
			<table class="type-small">
				<thead>
					<tr>
						<th scope="col" class="date">Date</th>
						<th scope="col" class="entry">Entry</th>
						<th scope="col" class="change">Change</th>
						<th scope="col" class="source">Source</th>
					</tr>
				</thead>
				<tbody>
					{#each week.rows as row (row.anchor)}
						<tr id={row.anchor}>
							<td class="date"><time datetime={row.day}>{row.date}</time></td>
							<th scope="row" class="entry">
								<span class="name">
									<span class="glyph">
										{#if row.state}<StateGlyph state={row.state} />{/if}
									</span>{row.name}
								</span>
							</th>
							<td class="change">{row.change}</td>
							<td class="source">
								<!-- A short commit hash stays whole at the end. Screen readers pause where the label splits, so the link is named with the full label. -->
								<a href={row.source} title={row.sourceLabel} aria-label={row.sourceLabel}
									><MiddleEllipsis text={row.sourceLabel} tail={7} /></a
								>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/each}
</article>

<style>
	.week {
		gap: var(--layout-week-gap);
	}

	table {
		table-layout: fixed;
	}

	th,
	td {
		white-space: nowrap;
	}

	.date {
		inline-size: 72px;
		color: var(--content-text-muted);
	}

	.entry {
		inline-size: 176px;
	}

	tbody .entry {
		color: var(--content-text-strong);
	}

	.name {
		display: flex;
		gap: var(--table-cell-gap);
		align-items: center;
		white-space: normal;
	}

	.glyph {
		flex-shrink: 0;
		inline-size: 14px;
		block-size: 14px;
	}

	.source {
		inline-size: 150px;
	}

	.source a {
		display: inline-flex;
		max-inline-size: 100%;
	}

	tbody tr {
		scroll-margin-block-start: var(--layout-page-padding-top);
	}

	tr:target {
		background: var(--nav-item-background-hover);
	}

	/* Phones and tablets: each row takes two lines, the entry and its date, then the change and its source. */
	@media (width < 1100px) {
		table,
		tbody {
			display: block;
			background: none;
			box-shadow: none;
		}

		/* Hidden from view only, so screen readers keep the column headers. */
		thead {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}

		tbody tr {
			display: flex;
			flex-wrap: wrap;
			column-gap: var(--change-row-column-gap);
			align-items: center;
			padding: var(--change-row-padding-y) 0;
		}

		tbody tr::before {
			flex-basis: 100%;
			order: 2;
			content: '';
		}

		th,
		td {
			inline-size: auto;
			padding: 0;
		}

		tbody .entry {
			flex: 1;
			order: 0;
		}

		.date {
			order: 1;
			inline-size: auto;
		}

		.change {
			order: 3;
			margin-block-start: var(--change-row-line-gap);
		}

		.source {
			flex: 1;
			order: 4;
			min-inline-size: 0;
			margin-block-start: var(--change-row-line-gap);
		}
	}
</style>
