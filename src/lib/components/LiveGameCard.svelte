<script lang="ts">
	import { formatDuration } from '#lib/shared/format.ts';
	import type {
		EncounterCounts,
		LiveGame,
		LiveParticipant,
		Platform,
		Puuid,
		RankedStatsMap
	} from '#lib/shared/types.ts';
	import LiveTeamColumn from './LiveTeamColumn.svelte';

	let {
		game,
		platform,
		highlightPuuid,
		selfPuuid = null,
		counts = {},
		stats,
		onselect,
		now = Date.now,
		tickMs = 1000
	}: {
		game: LiveGame;
		platform: Platform;
		highlightPuuid: Puuid;
		selfPuuid?: Puuid | null;
		counts?: EncounterCounts;
		stats?: RankedStatsMap | null;
		onselect?: (participant: LiveParticipant) => void;
		now?: () => number;
		tickMs?: number;
	} = $props();

	// Horloge locale : la durée avance chaque seconde sans nouvelle requête (FR-004).
	// svelte-ignore state_referenced_locally
	let current = $state(now());
	$effect(() => {
		const timer = setInterval(() => (current = now()), tickMs);
		return () => clearInterval(timer);
	});

	const elapsed = $derived(
		game.startedAt === null
			? null
			: formatDuration(Math.max(0, Math.floor((current - Date.parse(game.startedAt)) / 1000)))
	);
</script>

<section
	aria-label="Partie en cours"
	class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
>
	<header class="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
		<h2 class="text-lg font-semibold">Partie en cours</h2>
		<span class="text-sm text-zinc-600">{game.queueLabel}</span>
		<span class="ml-auto text-sm font-medium text-zinc-700 tabular-nums">
			{#if elapsed === null}
				Écran de chargement
			{:else}
				<span class="sr-only">Durée :</span>
				<span>{elapsed}</span>
			{/if}
		</span>
	</header>
	<div class="flex flex-col gap-4 md:flex-row">
		{#each game.teams as team (team.side)}
			<LiveTeamColumn {team} {platform} {highlightPuuid} {selfPuuid} {counts} {stats} {onselect} />
		{/each}
	</div>
</section>
