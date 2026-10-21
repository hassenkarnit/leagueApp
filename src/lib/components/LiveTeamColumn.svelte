<script lang="ts">
	import { resolve } from '$app/paths';
	import { averageRank, formatRank, winRateColor } from '#lib/shared/ranked.ts';
	import { toUrlSegment } from '#lib/shared/riot-id.ts';
	import type {
		EncounterCounts,
		LiveParticipant,
		LiveTeam,
		Platform,
		Puuid,
		RankedStatsMap
	} from '#lib/shared/types.ts';
	import EncounterBadge from './EncounterBadge.svelte';
	import RankEmblem from './RankEmblem.svelte';

	let {
		team,
		platform,
		highlightPuuid,
		selfPuuid = null,
		counts = {},
		stats,
		onselect
	}: {
		team: LiveTeam;
		platform: Platform;
		/** Joueur dont on consulte le profil (FR-007). */
		highlightPuuid: Puuid;
		/** Compte de référence (« C'est vous »). */
		selfPuuid?: Puuid | null;
		/** Badges 👥 (FR-009). */
		counts?: EncounterCounts;
		/** Niveau Solo/Duo (US3) : `null` = en cours de chargement, absent = non demandé. */
		stats?: RankedStatsMap | null;
		/** Clic sur un joueur → panneau « parties communes » (FR-010). */
		onselect?: (participant: LiveParticipant) => void;
	} = $props();

	// Rang moyen (US3) : se recalcule tout seul quand les statistiques arrivent (FR-012).
	const average = $derived(
		stats
			? averageRank(
					team.participants.flatMap((p) =>
						p.puuid !== null && stats[p.puuid] ? [stats[p.puuid]] : []
					),
					team.participants.length
				)
			: null
	);
</script>

<section class="min-w-0 flex-1">
	<h3 class="mb-2 text-sm font-medium {team.side === 'blue' ? 'text-sky-700' : 'text-rose-700'}">
		{team.side === 'blue' ? 'Équipe bleue' : 'Équipe rouge'}
	</h3>
	{#if stats !== undefined}
		<p data-team-average={team.side} class="mb-2 flex items-center gap-2 text-xs text-zinc-700">
			<span>Rang moyen :</span>
			{#if average === null}
				<span class="text-zinc-500">calcul…</span>
			{:else if average.status === 'unavailable'}
				<span class="text-zinc-500">Rang moyen indisponible</span>
			{:else}
				<RankEmblem tier={average.tier} label={average.tierLabel} size={24} />
				<span class="font-medium text-zinc-900"
					>{average.division ? `${average.tierLabel} ${average.division}` : average.tierLabel}</span
				>
				{#if average.counted < average.teamSize}
					<span class="text-zinc-500">({average.counted}/{average.teamSize} joueurs classés)</span>
				{/if}
			{/if}
		</p>
	{/if}
	<ul class="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white">
		{#each team.participants as participant, index (participant.puuid ?? `masque-${index}`)}
			{@const highlighted = participant.puuid !== null && participant.puuid === highlightPuuid}
			{@const riotId = `${participant.gameName}#${participant.tagLine}`}
			<li
				data-puuid={participant.puuid}
				aria-current={highlighted ? 'true' : undefined}
				class="flex items-center gap-3 px-3 py-2 {highlighted ? 'bg-indigo-50' : ''}"
			>
				{#if participant.championIconUrl}
					<img
						src={participant.championIconUrl}
						alt={participant.championName}
						width="40"
						height="40"
						class="size-10 rounded-md"
					/>
				{:else}
					<span class="flex size-10 items-center justify-center rounded-md bg-zinc-200 text-xs"
						>?</span
					>
				{/if}
				<div class="min-w-0 flex-1">
					{#if participant.isHidden || participant.puuid === null}
						<p class="font-medium text-zinc-600 italic">Joueur masqué</p>
					{:else}
						<p class="flex items-center gap-1.5 font-medium">
							{#if onselect}
								<button
									type="button"
									onclick={() => onselect(participant)}
									class="truncate text-left hover:text-indigo-700 hover:underline focus:ring-2 focus:ring-indigo-300 focus:outline-none"
									>{riotId}</button
								>
							{:else}
								<span class="truncate">{riotId}</span>
							{/if}
							{#if participant.puuid === selfPuuid}
								<span class="rounded bg-indigo-100 px-1 text-xs font-medium text-indigo-800"
									>C'est vous</span
								>
							{:else}
								<EncounterBadge count={counts[participant.puuid]} />
							{/if}
							<a
								href={resolve('/joueur/[platform]/[riotId]?from=match', {
									platform,
									riotId: toUrlSegment(participant)
								})}
								aria-label="Voir le profil de {riotId}"
								title="Voir le profil"
								class="rounded px-1 text-zinc-500 hover:bg-zinc-100 hover:text-indigo-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
								>↗</a
							>
						</p>
					{/if}
					<p class="truncate text-xs text-zinc-600">{participant.championName}</p>
				</div>
				{#if stats !== undefined && participant.puuid !== null}
					{@const playerStats = stats?.[participant.puuid]}
					<div class="flex shrink-0 items-center gap-2 text-right text-xs">
						{#if playerStats?.status === 'ranked'}
							<RankEmblem tier={playerStats.tier} label={playerStats.tierLabel} />
						{:else if playerStats?.status === 'unranked'}
							<RankEmblem tier={null} />
						{/if}
						<div>
							{#if stats === null}
								<p class="text-zinc-500">Chargement du classement…</p>
							{:else if playerStats?.status === 'ranked'}
								<p class="font-medium text-zinc-800">{formatRank(playerStats)}</p>
								<p class="text-zinc-600 tabular-nums">
									<span
										data-winrate
										class="font-medium"
										style:color={winRateColor(playerStats.wins, playerStats.losses)}
										>{playerStats.winRate} %</span
									>{` · ${playerStats.wins} V / ${playerStats.losses} D`}
								</p>
							{:else if playerStats?.status === 'unranked'}
								<p class="text-zinc-600">Non classé</p>
							{:else}
								<p class="text-zinc-500">Statistiques indisponibles</p>
							{/if}
						</div>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
</section>
