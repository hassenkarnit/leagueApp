<script lang="ts">
	let { count }: { count?: number } = $props();

	const label = $derived(count === 1 ? '1 partie ensemble' : `${count} parties ensemble`);
</script>

{#if count}
	<span
		role="img"
		aria-label={label}
		title={label}
		class="rounded-full bg-indigo-50 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-indigo-700"
		>👥 {count}</span
	>
{/if}
