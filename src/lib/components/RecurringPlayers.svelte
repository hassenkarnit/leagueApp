<script lang="ts">
	import { resolve } from '$app/paths';
	import { toApiError } from '#lib/client/api.ts';
	import { toUrlSegment } from '#lib/shared/riot-id.ts';
	import type { ApiError, Puuid, RecurringPlayer, ReferenceAccount } from '#lib/shared/types.ts';
	import ErrorMessage from './ErrorMessage.svelte';

	let {
		reference,
		load,
		version = 0
	}: {
		reference: ReferenceAccount;
		load: (referencePuuid: Puuid) => Promise<RecurringPlayer[]>;
		/** Change à chaque fin d'analyse : la liste est alors rechargée. */
		version?: number;
	} = $props();

	let players = $state<RecurringPlayer[] | null>(null);
	let error = $state<ApiError | null>(null);

	async function refresh(puuid: Puuid) {
		try {
			players = await load(puuid);
			error = null;
		} catch (err) {
			const apiError = toApiError(err);
			// Pas encore d'analyse : la liste apparaîtra à la fin de la première.
			if (apiError.code === 'REFERENCE_NOT_ANALYZED') players = [];
			else error = apiError;
		}
	}

	$effect(() => {
		void version;
		refresh(reference.puuid);
	});
</script>

<section aria-label="Joueurs croisés plusieurs fois" class="space-y-2 text-sm">
	<h2 class="font-semibold text-zinc-800">Joueurs croisés plusieurs fois</h2>
	{#if error}
		<ErrorMessage {error} />
	{:else if players === null}
		<p class="text-zinc-500">Chargement…</p>
	{:else if players.length === 0}
		<p class="text-zinc-500">Aucun joueur croisé plus d'une fois pour l'instant.</p>
	{:else}
		<ul class="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white">
			{#each players as player (player.puuid)}
				<li>
					<a
						href={resolve('/joueur/[platform]/[riotId]', {
							platform: reference.platform,
							riotId: toUrlSegment(player)
						})}
						class="flex flex-col gap-0.5 px-3 py-2 hover:bg-zinc-50"
					>
						<span class="flex items-baseline justify-between gap-2">
							<span class="truncate font-medium">{player.gameName}</span>
							<span class="shrink-0 text-xs text-zinc-500 tabular-nums">{player.total} parties</span
							>
						</span>
						<span class="flex gap-3 text-xs tabular-nums">
							<span class="text-blue-700">{player.sameTeam} avec moi</span>
							<span class="text-red-700">{player.opponents} contre moi</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
