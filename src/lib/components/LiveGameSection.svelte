<script lang="ts">
	import { toApiError } from '#lib/client/api.ts';
	import type {
		ApiError,
		EncounterCounts,
		LiveGameResult,
		LiveParticipant,
		Platform,
		Puuid,
		RankedStatsMap
	} from '#lib/shared/types.ts';
	import ErrorMessage from './ErrorMessage.svelte';
	import LiveGameCard from './LiveGameCard.svelte';

	let {
		loadLiveGame,
		platform,
		highlightPuuid,
		selfPuuid = null,
		loadCounts,
		loadRankedStats,
		onselect,
		now
	}: {
		/** Vérifie la partie en cours — appelé uniquement au clic (FR-001). */
		loadLiveGame: () => Promise<LiveGameResult>;
		platform: Platform;
		highlightPuuid: Puuid;
		selfPuuid?: Puuid | null;
		/** Badges 👥 : parties communes avec le compte de référence (US2). */
		loadCounts?: (puuids: Puuid[]) => Promise<EncounterCounts>;
		/** Rang et % de victoires (US3), chargés après la composition (FR-015). */
		loadRankedStats?: (puuids: Puuid[]) => Promise<RankedStatsMap>;
		onselect?: (participant: LiveParticipant) => void;
		now?: () => number;
	} = $props();

	let counts = $state<EncounterCounts>({});
	let stats = $state<RankedStatsMap | null | undefined>(undefined);

	function loadExtras(result: LiveGameResult) {
		if (result.state !== 'in-game') return;
		// Les joueurs masqués par Riot n'ont pas de PUUID : ni badge ni statistiques (FR-006a).
		const puuids = result.game.teams.flatMap((t) =>
			t.participants.flatMap((p) => (p.puuid ? [p.puuid] : []))
		);
		loadCounts?.(puuids).then(
			(loaded) => (counts = loaded),
			() => (counts = {}) // pas d'analyse ou erreur : simplement aucun badge
		);
		if (loadRankedStats) {
			stats = null;
			loadRankedStats(puuids).then(
				(loaded) => (stats = loaded),
				() => (stats = Object.fromEntries(puuids.map((p) => [p, { status: 'unavailable' }])))
			);
		}
	}

	let checking = $state(false);
	let result = $state<LiveGameResult | null>(null);
	let error = $state<ApiError | null>(null);

	async function refresh() {
		checking = true;
		try {
			// La card précédente reste affichée pendant la vérification (pas de clignotement).
			result = await loadLiveGame();
			error = null;
			loadExtras(result);
		} catch (err) {
			result = null;
			error = toApiError(err);
		} finally {
			checking = false;
		}
	}
</script>

<div class="space-y-3">
	<button
		type="button"
		onclick={refresh}
		disabled={checking}
		aria-busy={checking}
		class="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 focus:ring-2 focus:ring-indigo-300 focus:outline-none disabled:opacity-50"
	>
		Actualiser la partie en cours
	</button>
	{#if checking}
		<span role="status" class="ml-2 text-sm text-zinc-600">Vérification…</span>
	{/if}

	{#if error}
		<ErrorMessage {error} />
	{:else if result?.state === 'in-game'}
		<LiveGameCard
			game={result.game}
			{platform}
			{highlightPuuid}
			{selfPuuid}
			{counts}
			{stats}
			{onselect}
			{now}
		/>
	{:else if result?.state === 'other-mode'}
		<p role="status" class="text-sm text-zinc-600">
			En partie ({result.queueLabel}), pas en classée Solo/Duo
		</p>
	{:else if result?.state === 'not-in-game'}
		<p role="status" class="text-sm text-zinc-600">Pas de partie classée Solo/Duo en cours</p>
	{/if}
</div>
