<script lang="ts">
	import { siteTitle } from '#lib/meta.ts';
	import CodeCard from '#lib/components/CodeCard.svelte';
	import Head from '#lib/components/Head.svelte';
	import { contributeSections } from '#lib/toc.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const [report, edit, site] = contributeSections;
	const repo = 'https://github.com/benjuntilla/areweosc7501yet';
</script>

<Head
	title="Contribute · {siteTitle}"
	description="Report a change or edit the data behind {siteTitle}"
/>

<article class="page">
	<h1 class="type-h1">Contribute</h1>

	<section aria-labelledby={report.id}>
		<h2 class="type-h2" id={report.id}>{report.label}</h2>
		<p>
			Use <a href="{repo}/issues/new?template=report-a-change.yml">the issue form</a>. Give the
			project name and a link that shows its state. If a release contains the support, also give the
			version.
		</p>
	</section>

	<section aria-labelledby={edit.id}>
		<h2 class="type-h2" id={edit.id}>{edit.label}</h2>
		<p>
			<a href="{repo}/pulls">Pull requests</a> are welcome. Each entry is one TOML file in
			<a href="{repo}/tree/main/data/entries"><code>data/entries/</code></a>, named after the
			project. The <code>[[history]]</code> blocks are in chronological order, so the last block
			shows the current state and its source. If the state changes, add a new block at the end. If
			the new state is done and the project is on GitHub, add <code>version</code> with the release
			that contains the support. Use a primary source, such as the PR or the release notes.
			<a href="/methodology">Methodology</a> lists what counts as a source.
		</p>
		<p>As an example, this is the file for kitty:</p>
		<CodeCard label="data/entries/kitty.toml" code={data.kitty} html={data.html} />
		<p>
			The weekly checker writes the <code>[github]</code> table. Do not change this table. If the
			checker cannot follow the last block, set <code>last_checked_date</code> to the date that you examined
			the source. The checker can follow a PR, an issue, a commit, or a release in the GitHub repo of
			the project.
		</p>
	</section>

	<section aria-labelledby={site.id}>
		<h2 class="type-h2" id={site.id}>{site.label}</h2>
		<p>
			The site uses SvelteKit and plain CSS, and runs on Cloudflare. The code is MIT, and the data
			is CC0. <a href="/data.json" data-sveltekit-reload><code>/data.json</code></a> has the full
			list. Report bugs and ideas for the site in <a href="{repo}/issues">GitHub issues</a>.
		</p>
	</section>
</article>
