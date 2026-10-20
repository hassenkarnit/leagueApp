<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatKda } from '#lib/shared/format.ts';
	import { toUrlSegment } from '#lib/shared/riot-id.ts';
	import type { EncounterCounts, Participant, Platform, Team } from '#lib/shared/types.ts';
	import EncounterBadge from './EncounterBadge.svelte';

	let {
		team,
		platform = null,
		counts = {},
		onselect
	}: {
		team: Team;
		/** Serveur du match : nécessaire pour le lien « Voir le profil » (US3). */
		platform?: Platform | null;
		/** Parties communes avec le compte de référence (badges 👥, US2). */
		counts?: EncounterCounts;
		/** Clic sur un joueur humain (panneau « parties communes », US2). */
		onselect?: (participant: Participant) => void;
	} = $props();

	function riotIdSegment(participant: Participant): string {
		return toUrlSegment({
			gameName: participant.gameName ?? '',
			tagLine: participant.tagLine ?? ''
		});
	}

	const OUTCOME_LABELS = { win: 'Victoire', loss: 'Défaite', remake: 'Partie annulée' } as const;
	const OUTCOME_COLORS = {
		win: 'text-emerald-700',
		loss: 'text-red-700',
		remake: 'text-zinc-500'
	} as const;
</script>

<section class="min-w-0 flex-1">
	<h3 class="mb-2 flex items-baseline justify-between text-sm font-medium">
		<span>{team.side === 'blue' ? 'Équipe bleue' : 'Équipe rouge'}</span>
		<span class={OUTCOME_COLORS[team.outcome]}>{OUTCOME_LABELS[team.outcome]}</span>
	</h3>
	<ul class="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white">
		{#each team.participants as participant, index (participant.puuid ?? `bot-${index}`)}
			<li class="flex items-center gap-2 px-2 py-1.5 text-sm">
				<img
					src={participant.championIconUrl}
					alt={participant.championName}
					width="24"
					height="24"
					class="size-6 rounded"
				/>
				<span class="flex min-w-0 flex-1 items-center gap-1.5">
					{#if participant.isBot}
						<span class="text-zinc-500">Bot</span>
					{:else if onselect}
						<button
							type="button"
							onclick={() => onselect(participant)}
							class="truncate text-left hover:text-indigo-700 hover:underline focus:ring-2 focus:ring-indigo-300 focus:outline-none"
							>{participant.gameName}#{participant.tagLine}</button
						>
					{:else}
						<span class="truncate">{participant.gameName}#{participant.tagLine}</span>
					{/if}
					{#if participant.puuid}
						<EncounterBadge count={counts[participant.puuid]} />
					{/if}
				</span>
				{#if !participant.isBot && platform}
					<a
						href={resolve('/joueur/[platform]/[riotId]?from=match', {
							platform,
							riotId: riotIdSegment(participant)
						})}
						aria-label="Voir le profil de {participant.gameName}#{participant.tagLine}"
						title="Voir le profil"
						class="rounded px-1 text-zinc-500 hover:bg-zinc-100 hover:text-indigo-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
						>↗</a
					>
				{/if}
				<span class="text-zinc-500 tabular-nums">{formatKda(participant)}</span>
			</li>
		{/each}
	</ul>
</section>
