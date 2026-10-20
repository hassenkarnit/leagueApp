<script lang="ts">
	import type { Snapshot } from '@sveltejs/kit';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { apiGet } from '#lib/client/api.ts';
	import {
		getEncounterCounts,
		getEncounterSummary,
		getLiveGame,
		getRankedStats
	} from '#lib/client/endpoints.ts';
	import { reference } from '#lib/client/reference.svelte.ts';
	import EncounterPanel from '#lib/components/EncounterPanel.svelte';
	import ErrorMessage from '#lib/components/ErrorMessage.svelte';
	import LiveGameSection from '#lib/components/LiveGameSection.svelte';
	import MatchList, { type MatchListState } from '#lib/components/MatchList.svelte';
	import PlayerHeader from '#lib/components/PlayerHeader.svelte';
	import SearchForm from '#lib/components/SearchForm.svelte';
	import { isPlatform } from '#lib/shared/platforms.ts';
	import { formatRiotId, toUrlSegment } from '#lib/shared/riot-id.ts';
	import type { MatchPage, Platform, PlayerRef, Puuid, RiotId } from '#lib/shared/types.ts';
	import type { PageProps } from './$types';

	let { data, params }: PageProps = $props();

	const currentPlatform = $derived<Platform | undefined>(
		isPlatform(params.platform) ? params.platform : undefined
	);
	const currentRiotId = $derived(data.profile ? formatRiotId(data.profile) : '');

	function openPlayer(platform: Platform, riotId: RiotId) {
		goto(resolve('/joueur/[platform]/[riotId]', { platform, riotId: toUrlSegment(riotId) }));
	}

	function loadPage(start: number) {
		return apiGet<MatchPage>(`${data.apiBase}/matches?start=${start}&count=20`);
	}

	/** Badges 👥 : seulement si un compte de référence est défini (sinon aucun appel). */
	async function loadCounts(puuids: Puuid[]) {
		return reference.current ? getEncounterCounts(reference.current.puuid, puuids) : {};
	}

	/** Joueur dont on affiche les parties communes (panneau latéral). */
	let selected = $state<PlayerRef | null>(null);

	// Au retour arrière, on retrouve les matchs déjà chargés et dépliés (US3).
	let list = $state<ReturnType<typeof MatchList>>();
	export const snapshot: Snapshot<MatchListState | undefined> = {
		capture: () => list?.capture(),
		restore: (state) => {
			if (state) list?.restore(state);
		}
	};
</script>

<svelte:head>
	<title>{data.profile ? `${formatRiotId(data.profile)} · LeagueApp` : 'LeagueApp'}</title>
</svelte:head>

<div class="space-y-8">
	{#key data.apiBase}
		<SearchForm
			onsearch={openPlayer}
			initialRiotId={currentRiotId}
			initialPlatform={currentPlatform}
		/>
	{/key}

	{#if data.error}
		<ErrorMessage error={data.error} />
		{#if data.fromMatch && data.error.code === 'PLAYER_NOT_FOUND'}
			<p class="text-sm text-zinc-600">
				Ce joueur a peut-être changé de pseudo depuis cette partie.
			</p>
		{/if}
	{/if}

	{#if data.profile}
		<PlayerHeader profile={data.profile} />
		{#if currentPlatform}
			<!-- Partie en cours (feature 002) : vérifiée uniquement au clic. -->
			{#key data.apiBase}
				<LiveGameSection
					loadLiveGame={() => getLiveGame(data.apiBase)}
					platform={currentPlatform}
					highlightPuuid={data.profile.puuid}
					selfPuuid={reference.current?.puuid ?? null}
					{loadCounts}
					loadRankedStats={(puuids) => getRankedStats(currentPlatform, puuids)}
					onselect={(participant) => (selected = participant)}
				/>
			{/key}
		{/if}
	{/if}

	{#if data.firstPage}
		<section aria-label="Historique des matchs">
			<!-- Nouvelle liste à chaque joueur : son état (pages chargées) ne doit pas être réutilisé. -->
			{#key data.apiBase}
				<MatchList
					bind:this={list}
					initialPage={data.firstPage}
					{loadPage}
					{loadCounts}
					onselect={(participant) => (selected = participant)}
				/>
			{/key}
		</section>
	{/if}
</div>

{#if selected}
	<EncounterPanel
		reference={reference.current}
		participant={selected}
		load={getEncounterSummary}
		onclose={() => (selected = null)}
	/>
{/if}
