<script lang="ts">
	interface Props {
		updated: string;
		spec: { readonly number: string; readonly url: string | undefined };
	}

	let { updated, spec }: Props = $props();
</script>

<footer class="footer type-small">
	<p>
		Made by <a href="https://benjuntilla.com">Ben Juntilla</a> & community-maintained. Not affiliated
		with Superlogical.
	</p>
	<p>
		Last updated {updated} · Tracking <a href={spec.url}>spec revision {spec.number}</a> · Code is MIT,
		data is CC0.
	</p>
</footer>

<style>
	.footer {
		display: flex;
		flex-direction: column;
		gap: var(--footer-gap);
		padding-block-start: var(--footer-padding-top);
		color: var(--footer-text);
		border-block-start: 1px solid var(--footer-divider);
	}

	a {
		color: var(--footer-link);
	}

	a:hover {
		color: var(--link-text-hover);
	}
</style>
