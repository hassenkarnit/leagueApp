<script lang="ts">
	import type { Snippet } from 'svelte';
	import { formatKda } from '#lib/shared/format.ts';
	import type { Participant, Team } from '#lib/shared/types.ts';

	let {
		team,
		actions
	}: {
		team: Team;
		/** Emplacement pour des actions sur un joueur humain (badge, profil…) — US2/US3. */
		actions?: Snippet<[Participant]>;
	} = $props();

	const OUTCOME_LABELS = { win: 'Victoire', loss: 'Défaite', remake: 'Partie annulée' } as const;
	const OUTCOME_COLORS = {
		win: 'text-emerald-700',
		loss: 'text-red-700',
		remake: 'text-zinc-500'
	} as const;
</script>

<section class="flex-1">
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
				<span class="min-w-0 flex-1 truncate">
					{#if participant.isBot}
						<span class="text-zinc-500">Bot</span>
					{:else}
						{participant.gameName}#{participant.tagLine}
					{/if}
				</span>
				{#if !participant.isBot && actions}
					{@render actions(participant)}
				{/if}
				<span class="text-zinc-500 tabular-nums">{formatKda(participant)}</span>
			</li>
		{/each}
	</ul>
</section>
