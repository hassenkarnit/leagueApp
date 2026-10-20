<script lang="ts">
	import type { ApiError } from '#lib/shared/types.ts';

	let { error }: { error: ApiError } = $props();
</script>

<div role="alert" class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
	<p>{error.message}</p>
	{#if error.retryAfterSeconds !== undefined}
		<p class="mt-1 text-red-700">Nouvel essai possible dans {error.retryAfterSeconds} s.</p>
	{/if}
</div>
