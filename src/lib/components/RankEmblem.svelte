<script lang="ts">
	import { emblemUrl } from '#lib/shared/ranked.ts';

	let {
		tier,
		label = '',
		size = 28
	}: {
		/** Palier Riot (`GOLD`…) ; `null` → emblème neutre « Sans rang ». */
		tier: string | null;
		label?: string;
		size?: number;
	} = $props();

	let failed = $state(false);
	const url = $derived(emblemUrl(tier));
</script>

{#if tier === null}
	<svg
		role="img"
		aria-label="Sans rang"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		class="shrink-0 text-zinc-400"
	>
		<circle
			cx="12"
			cy="12"
			r="8"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-dasharray="3 3"
		/>
	</svg>
{:else if url !== null && !failed}
	<img
		src={url}
		alt={label}
		width={size}
		height={size}
		class="shrink-0 object-contain"
		onerror={() => (failed = true)}
	/>
{/if}
