<script lang="ts">
	import { toApiError } from '#lib/client/api.ts';
	import type { ReferenceStore } from '#lib/client/reference.svelte.ts';
	import { DEFAULT_PLATFORM, PLATFORMS } from '#lib/shared/platforms.ts';
	import { formatRiotId, parseRiotIdInput } from '#lib/shared/riot-id.ts';
	import type { ApiError, Platform, PlayerProfile, RiotId } from '#lib/shared/types.ts';
	import ErrorMessage from './ErrorMessage.svelte';

	let {
		store,
		lookup
	}: {
		store: ReferenceStore;
		/** Retrouve le compte (et son PUUID) via notre API. */
		lookup: (platform: Platform, riotId: RiotId) => Promise<PlayerProfile>;
	} = $props();

	let editing = $state(false);
	let riotIdInput = $state('');
	let platform = $state<Platform>(DEFAULT_PLATFORM);
	let saving = $state(false);
	let error = $state<ApiError | null>(null);

	const showForm = $derived(store.current === null || editing);

	function startEditing() {
		riotIdInput = store.current ? formatRiotId(store.current) : '';
		platform = store.current?.platform ?? DEFAULT_PLATFORM;
		error = null;
		editing = true;
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		const parsed = parseRiotIdInput(riotIdInput);
		if (!parsed.ok) {
			error = { code: 'INVALID_RIOT_ID', message: parsed.message };
			return;
		}
		saving = true;
		error = null;
		try {
			const profile = await lookup(platform, parsed.value);
			store.set({
				puuid: profile.puuid,
				gameName: profile.gameName,
				tagLine: profile.tagLine,
				platform
			});
			editing = false;
		} catch (err) {
			error = toApiError(err);
		} finally {
			saving = false;
		}
	}

	function clear() {
		store.clear();
		riotIdInput = '';
		editing = false;
	}
</script>

<div class="flex flex-col items-end gap-2 text-sm">
	{#if showForm}
		<form onsubmit={save} class="flex flex-wrap items-end gap-2" novalidate>
			<label class="flex flex-col gap-0.5 text-xs font-medium text-zinc-600">
				Mon Riot ID
				<input
					bind:value={riotIdInput}
					type="text"
					placeholder="Pseudo#TAG"
					autocomplete="off"
					class="w-40 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-normal text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
			</label>
			<label class="flex flex-col gap-0.5 text-xs font-medium text-zinc-600">
				Serveur de mon compte
				<select
					bind:value={platform}
					class="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-normal text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				>
					{#each PLATFORMS as option (option.id)}
						<option value={option.id}>{option.id.toUpperCase()}</option>
					{/each}
				</select>
			</label>
			<button
				type="submit"
				disabled={saving}
				class="rounded-md bg-indigo-600 px-3 py-1 font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none disabled:opacity-50"
			>
				Enregistrer
			</button>
			{#if editing}
				<button
					type="button"
					onclick={() => (editing = false)}
					class="rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100"
				>
					Annuler
				</button>
			{/if}
		</form>
		{#if error}
			<ErrorMessage {error} />
		{/if}
	{:else if store.current}
		<div class="flex items-center gap-2">
			<span class="text-zinc-500">Moi :</span>
			<span class="font-medium">{formatRiotId(store.current)}</span>
			<button
				type="button"
				onclick={startEditing}
				class="rounded-md px-2 py-0.5 text-zinc-600 hover:bg-zinc-100">Modifier</button
			>
			<button
				type="button"
				onclick={clear}
				class="rounded-md px-2 py-0.5 text-zinc-600 hover:bg-zinc-100">Effacer</button
			>
		</div>
	{/if}
</div>
