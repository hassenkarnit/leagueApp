<script lang="ts">
	import { formatDuration, formatKda, formatRelativeDate } from '#lib/shared/format.ts';
	import { platformFromMatchId } from '#lib/shared/platforms.ts';
	import type { EncounterCounts, MatchSummary, Participant, Puuid } from '#lib/shared/types.ts';
	import TeamTable from './TeamTable.svelte';

	let {
		match,
		expanded = $bindable(false),
		loadCounts,
		onselect
	}: {
		match: MatchSummary;
		expanded?: boolean;
		/** Badges 👥 : parties communes avec le compte de référence (US2). */
		loadCounts?: (puuids: Puuid[]) => Promise<EncounterCounts>;
		onselect?: (participant: Participant) => void;
	} = $props();

	const platform = $derived(platformFromMatchId(match.matchId));

	let counts = $state<EncounterCounts>({});

	// À chaque dépliage, on (re)demande les badges : une analyse a pu se terminer entre-temps.
	$effect(() => {
		if (!expanded || !loadCounts) return;
		const puuids = match.teams.flatMap((t) => t.participants.flatMap((p) => p.puuid ?? []));
		loadCounts(puuids).then(
			(result) => (counts = result),
			() => (counts = {}) // pas d'analyse ou erreur : simplement aucun badge
		);
	});

	const OUTCOME_LABELS = { win: 'Victoire', loss: 'Défaite', remake: 'Partie annulée' } as const;
	const OUTCOME_STYLES = {
		win: 'border-l-emerald-500',
		loss: 'border-l-red-500',
		remake: 'border-l-zinc-300'
	} as const;
	const OUTCOME_TEXT = {
		win: 'text-emerald-700',
		loss: 'text-red-700',
		remake: 'text-zinc-500'
	} as const;

	const detailsId = $derived(`match-${match.matchId}`);
</script>

<article
	class="rounded-lg border border-l-4 border-zinc-200 bg-white {OUTCOME_STYLES[match.outcome]}"
>
	<div class="flex items-center gap-4 p-3">
		<img
			src={match.player.championIconUrl}
			alt={match.player.championName}
			width="48"
			height="48"
			class="size-12 rounded-md"
		/>
		<div class="min-w-0 flex-1">
			<p class="font-medium {OUTCOME_TEXT[match.outcome]}">{OUTCOME_LABELS[match.outcome]}</p>
			<p class="text-sm text-zinc-600">{match.queueLabel}</p>
		</div>
		<div class="text-right">
			<p class="font-medium tabular-nums">{formatKda(match.player)}</p>
			<p class="text-xs text-zinc-500">
				<time datetime={match.playedAt} title={new Date(match.playedAt).toLocaleString('fr-FR')}
					>{formatRelativeDate(match.playedAt)}</time
				>
				· <span class="tabular-nums">{formatDuration(match.durationSeconds)}</span>
			</p>
		</div>
		<button
			type="button"
			onclick={() => (expanded = !expanded)}
			aria-expanded={expanded}
			aria-controls={detailsId}
			class="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
		>
			{expanded ? 'Masquer les participants' : 'Voir les participants'}
		</button>
	</div>

	{#if expanded}
		<div id={detailsId} class="flex flex-col gap-4 border-t border-zinc-100 p-3 sm:flex-row">
			{#each match.teams as team (team.side)}
				<TeamTable {team} {platform} {counts} {onselect} />
			{/each}
		</div>
	{/if}
</article>
