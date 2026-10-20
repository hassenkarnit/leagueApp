<script lang="ts">
	import { toApiError } from '#lib/client/api.ts';
	import { formatRelativeDate } from '#lib/shared/format.ts';
	import type {
		ApiError,
		EncounterGame,
		EncounterStats,
		EncounterSummary,
		Participant,
		Puuid,
		ReferenceAccount
	} from '#lib/shared/types.ts';
	import ErrorMessage from './ErrorMessage.svelte';

	let {
		reference,
		participant,
		load,
		onclose,
		now = Date.now
	}: {
		reference: ReferenceAccount | null;
		participant: Participant;
		load: (referencePuuid: Puuid, otherPuuid: Puuid) => Promise<EncounterSummary>;
		onclose: () => void;
		now?: () => number;
	} = $props();

	let summary = $state<EncounterSummary | null>(null);
	let closeButton = $state<HTMLButtonElement>();

	// Le focus clavier passe dans le panneau dès son ouverture.
	$effect(() => {
		closeButton?.focus();
	});
	let error = $state<ApiError | null>(null);

	const title = $derived(`${participant.gameName}#${participant.tagLine}`);
	const isSelf = $derived(reference !== null && participant.puuid === reference.puuid);

	$effect(() => {
		summary = null;
		error = null;
		if (!reference || !participant.puuid || isSelf) return;
		load(reference.puuid, participant.puuid).then(
			(result) => (summary = result),
			(err: unknown) => (error = toApiError(err))
		);
	});

	const notAnalyzed = $derived(error?.code === 'REFERENCE_NOT_ANALYZED');

	function plural(count: number, word: string): string {
		return `${count} ${word}${count > 1 ? 's' : ''}`;
	}

	function describe(stats: EncounterStats): string {
		const parts = [plural(stats.wins, 'victoire'), plural(stats.losses, 'défaite')];
		if (stats.remakes > 0) parts.push(plural(stats.remakes, 'annulée'));
		return `${stats.games} (${parts.join(', ')})`;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-FR');
	}

	function periodSince(oldest: string | null): string {
		return oldest ? ` (depuis le ${formatDate(oldest)})` : '';
	}

	function matchup(game: EncounterGame): string {
		const link = game.relation === 'same-team' ? 'avec' : 'vs';
		return `${game.referenceChampion} ${link} ${game.otherChampion}`;
	}

	const OUTCOME_LABELS = { win: 'Victoire', loss: 'Défaite', remake: 'Annulée' } as const;

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onclose();
	}
</script>

<svelte:document {onkeydown} />

<div
	role="dialog"
	aria-label={title}
	class="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col gap-4 overflow-y-auto border-l border-zinc-200 bg-white p-5 shadow-xl"
>
	<header class="flex items-start justify-between gap-2">
		<div>
			<p class="text-xs text-zinc-500">Parties communes avec</p>
			<h2 class="text-lg font-semibold">{title}</h2>
		</div>
		<button
			type="button"
			bind:this={closeButton}
			onclick={onclose}
			aria-label="Fermer"
			class="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
			>✕</button
		>
	</header>

	{#if !reference}
		<p class="text-sm text-zinc-600">
			Indique ton Riot ID (en haut de la page) pour savoir si tu as déjà joué avec ce joueur.
		</p>
	{:else if isSelf}
		<p class="text-sm font-medium">C'est vous</p>
	{:else if error}
		<ErrorMessage {error} />
		{#if notAnalyzed}
			<p class="text-sm text-zinc-600">
				Clique sur « Analyser mon historique » en haut de la page.
			</p>
		{/if}
	{:else if !summary}
		<p role="status" class="text-sm text-zinc-500">Chargement…</p>
	{:else if summary.total === 0}
		<p class="text-sm">
			Jamais joué ensemble sur tes {summary.period.analyzedCount} dernières parties{periodSince(
				summary.period.oldestMatchAt
			)}
		</p>
	{:else}
		<div class="space-y-2 text-sm">
			<p class="text-base font-semibold">
				👥 {summary.total === 1 ? '1 partie ensemble' : `${summary.total} parties ensemble`}
			</p>
			<p>Même équipe : {describe(summary.sameTeam)}</p>
			<p>Adversaires : {describe(summary.opponents)}</p>
			{#if summary.lastPlayedAt}
				<p class="text-zinc-600">
					Dernière partie : {formatRelativeDate(summary.lastPlayedAt, now())}
				</p>
			{/if}
			<p class="text-xs text-zinc-500">
				Sur tes {summary.period.analyzedCount} dernières parties analysées.
			</p>
		</div>

		<details class="text-sm">
			<summary
				class="cursor-pointer rounded font-medium text-indigo-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
				>Voir les parties</summary
			>
			<ul class="mt-2 divide-y divide-zinc-100">
				{#each summary.games as game (game.matchId)}
					<li class="py-2">
						<p>
							{matchup(game)}
							· <span class="font-medium">{OUTCOME_LABELS[game.referenceOutcome]}</span>
						</p>
						<p class="text-xs text-zinc-500">
							<span>{game.queueLabel}</span> · {formatDate(game.playedAt)}
						</p>
					</li>
				{/each}
			</ul>
		</details>
	{/if}
</div>
