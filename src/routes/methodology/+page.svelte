<script lang="ts">
	import { siteTitle } from '#lib/meta.ts';
	import StateGlyph from '#lib/components/StateGlyph.svelte';
	import StateWord from '#lib/components/StateWord.svelte';
	import { featuredStars, ladderRows } from '#lib/domain/derive.ts';
	import type { State } from '#lib/domain/schema.ts';
	import { methodologySections } from '#lib/toc.ts';

	const [
		done,
		working,
		blocked,
		idle,
		error,
		verdict,
		roles,
		featured,
		revisions,
		checks,
		sources
	] = methodologySections;
	const spec = 'https://www.superlogical.com/rex/docs/build/program-status';
</script>

<svelte:head>
	<title>Methodology · {siteTitle}</title>
	<meta
		name="description"
		content="How {siteTitle} decides each state and each verdict, and where its data comes from."
	/>
</svelte:head>

{#snippet definition(section: { id: string; label: string }, state: State)}
	<h2 class="type-h2 definition" id={section.id}>
		Definition of <span class="state-label"><StateGlyph {state} size={16} />{state}</span>
	</h2>
{/snippet}

<article class="page">
	<div class="page-head">
		<h1 class="type-h1">Methodology</h1>
		<p>
			The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY on this page are to be interpreted as
			described in BCP 14 (<a href="https://www.rfc-editor.org/rfc/rfc2119">RFC 2119</a>,
			<a href="https://www.rfc-editor.org/rfc/rfc8174">RFC 8174</a>) when, and only when, they
			appear in all capitals.
		</p>
	</div>

	<section aria-labelledby={done.id}>
		{@render definition(done, 'done')}
		<p>
			An entry MUST NOT be <StateWord state="done" /> until a stable release contains OSC 7501 support.
			A stable release is a release that the default install or update method delivers. If OSC 7501 support
			is off by default, the entry is <StateWord state="done" /> and MUST have a note that tells how to
			enable support; any <StateWord state="done" /> entry with other limits, such as a different id limit,
			SHOULD also have a note. The source MUST be the release or changelog.
		</p>
		<p>
			For a closed-source tool, official documentation or a changelog that names OSC 7501 MAY stand
			in for a stable release.
		</p>
	</section>

	<section aria-labelledby={working.id}>
		{@render definition(working, 'working')}
		<p>
			A pre-release, beta or nightly build that requires explicit user opt-in MUST have the state <StateWord
				state="working"
			/>, not <StateWord state="done" />. Open PRs, and merged code that is not yet in any release,
			also have the state <StateWord state="working" />. For closed-source tools, proofs of concept
			and announcements SHOULD have the state <StateWord state="working" />. The source MUST be the
			PR or announcement.
		</p>
	</section>

	<section aria-labelledby={blocked.id}>
		{@render definition(blocked, 'blocked')}
		<p>
			An entry MUST have the state <StateWord state="blocked" /> if an attempt to add OSC 7501 support
			stopped. If a maintainer refused to add it, the entry MUST have the state <StateWord
				state="error"
			/> instead. The source MUST be the closed PR or other stopped attempt.
		</p>
	</section>

	<section aria-labelledby={idle.id}>
		{@render definition(idle, 'idle')}
		<p>
			An entry MUST have the state <StateWord state="idle" /> if no work on OSC 7501 support exists, or
			only a feature request. If a request exists, the source MUST be that request.
		</p>
	</section>

	<section aria-labelledby={error.id}>
		{@render definition(error, 'error')}
		<p>
			An entry MUST have the state <StateWord state="error" /> if a maintainer refused to add OSC 7501
			support, or closed the request as not planned. The source MUST be the issue or comment that shows
			this decision.
		</p>
	</section>

	<section aria-labelledby={verdict.id}>
		<h2 class="type-h2" id={verdict.id}>{verdict.label}</h2>
		<p>
			Each side MUST have one verdict word. The word comes from the score of that side. Libraries
			and engines MUST NOT count toward the score.
		</p>
		<p class="formula">
			score = (<StateWord state="done" /> + ½ × <StateWord state="working" />) ÷ featured entries
		</p>
		<p>
			A <StateWord state="working" /> entry counts toward the score because it shows that support is coming.
			Thus the verdict can change before a release. The entry counts as half because users cannot use
			it yet.
		</p>
		<table class="ladder type-small">
			<thead>
				<tr><th scope="col">Score</th><th scope="col">Word</th></tr>
			</thead>
			<tbody>
				{#each ladderRows as row (row.word)}
					<tr><th scope="row">{row.range}</th><td>{row.word}</td></tr>
				{/each}
			</tbody>
		</table>
	</section>

	<section aria-labelledby={roles.id}>
		<h2 class="type-h2" id={roles.id}>{roles.label}</h2>
		<p>
			This site uses the terms program and terminal <a href="{spec}#conventions"
				>as the spec defines them</a
			>.
		</p>
		<p>
			If a library or engine helps a program send reports, it is under programs. If it helps a
			terminal keep the reports, it is under terminals. Libraries and engines MUST NOT count toward
			the verdict, because end users do not use them directly.
		</p>
	</section>

	<section aria-labelledby={featured.id}>
		<h2 class="type-h2" id={featured.id}>{featured.label}</h2>
		<p>
			An entry is featured if its project has {featuredStars.toLocaleString('en-US')} or more GitHub stars,
			or if a major vendor makes it. Non-featured entries overflow into “+ N more” at the end of their
			group. Maintainers MAY feature an entry manually.
		</p>
	</section>

	<section aria-labelledby={revisions.id}>
		<h2 class="type-h2" id={revisions.id}>{revisions.label}</h2>
		<p>
			OSC 7501 is at its fourth revision, and more revisions are likely. Each entry MUST record the
			spec revision of its last check. A new revision MUST NOT change the state of an entry. If a
			new revision affects an entry, that entry SHOULD get a note. The <a
				href="{spec}#revision-history">revision history</a
			> of the spec has the details.
		</p>
	</section>

	<section aria-labelledby={checks.id}>
		<h2 class="type-h2" id={checks.id}>{checks.label}</h2>
		<p>
			Each Monday, a <a href="https://github.com/benjuntilla/areweosc7501yet/actions"
				>GitHub Action</a
			>
			finds new PRs and issues that mention OSC 7501. The action also compares each <StateWord
				state="working"
			/> entry with the latest release of its project. The action puts all findings into one PR. A person
			MUST review that PR before the data changes.
		</p>
		<p>
			Each entry shows the date of its last check. If the action cannot follow the last history
			block of an entry, a person SHOULD check that entry manually at least every 30 days. The
			action can follow a PR, an issue, a commit, or a release in the GitHub repo of the project. If
			a featured entry changes state, the change shows in the <a
				href="/feed.xml"
				data-sveltekit-reload>Atom feed</a
			>.
		</p>
	</section>

	<section aria-labelledby={sources.id}>
		<h2 class="type-h2" id={sources.id}>{sources.label}</h2>
		<p>
			The first list came from <a href="https://github.com/hyeebeen/awesome-osc7501"
				>awesome-osc7501</a
			>
			by hyeebeen. We checked the featured entries against primary sources. Like that list, our data is
			CC0. <a href="/data.json" data-sveltekit-reload>/data.json</a> has every entry and its history.
		</p>
	</section>
</article>

<style>
	.definition {
		display: flex;
		flex-wrap: wrap;
		column-gap: var(--heading-state-icon-gap);
		align-items: center;
	}

	.state-label {
		display: inline-flex;
		align-items: center;
	}

	.formula {
		font-weight: var(--type-weight-medium);
	}

	.ladder {
		inline-size: 100%;
		border-collapse: collapse;
		background: var(--card-background);
		border-radius: var(--card-radius);
		box-shadow: var(--card-elevation);
	}

	th,
	td {
		padding: var(--table-cell-padding-y) var(--table-cell-padding-x);
		font-weight: inherit;
		text-align: start;
	}

	thead th {
		color: var(--content-text-muted);
	}

	tbody th {
		inline-size: 160px;
		color: var(--content-text-strong);
	}

	tr + tr,
	tbody tr {
		border-block-start: 1px solid var(--content-divider);
	}
</style>
