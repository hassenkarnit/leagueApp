<script lang="ts">
	import { DEFAULT_PLATFORM, PLATFORMS } from '#lib/shared/platforms.ts';
	import { parseRiotIdInput } from '#lib/shared/riot-id.ts';
	import type { Platform, RiotId } from '#lib/shared/types.ts';

	let {
		onsearch,
		initialRiotId = '',
		initialPlatform = DEFAULT_PLATFORM
	}: {
		onsearch: (platform: Platform, riotId: RiotId) => void;
		initialRiotId?: string;
		initialPlatform?: Platform;
	} = $props();

	// Valeurs initiales seulement : le formulaire est ensuite piloté par la saisie.
	// svelte-ignore state_referenced_locally
	let riotIdInput = $state(initialRiotId);
	// svelte-ignore state_referenced_locally
	let platform = $state<Platform>(initialPlatform);
	let formatError = $state<string | null>(null);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const result = parseRiotIdInput(riotIdInput);
		if (!result.ok) {
			formatError = result.message;
			return;
		}
		formatError = null;
		onsearch(platform, result.value);
	}
</script>

<form onsubmit={submit} class="flex flex-col gap-2 sm:flex-row sm:items-end" novalidate>
	<label class="flex flex-1 flex-col gap-1 text-sm font-medium text-zinc-700">
		Riot ID
		<input
			bind:value={riotIdInput}
			type="text"
			placeholder="Pseudo#TAG"
			autocomplete="off"
			spellcheck="false"
			aria-invalid={formatError !== null}
			class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-base font-normal text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
		/>
	</label>
	<label class="flex flex-col gap-1 text-sm font-medium text-zinc-700">
		Serveur
		<select
			bind:value={platform}
			class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-base font-normal text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
		>
			{#each PLATFORMS as option (option.id)}
				<option value={option.id}>{option.label}</option>
			{/each}
		</select>
	</label>
	<button
		type="submit"
		class="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
	>
		Rechercher
	</button>
</form>
{#if formatError}
	<p role="alert" class="mt-2 text-sm text-red-700">{formatError}</p>
{/if}
