<script module lang="ts">
	import type { MatchSummary } from '#lib/shared/types.ts';

	/** État sauvegardé par SvelteKit (snapshot) pour le retrouver au retour arrière (US3). */
	export interface MatchListState {
		matches: MatchSummary[];
		hasMore: boolean;
		pagesLoaded: number;
		expanded: Record<string, boolean>;
	}
</script>

<script lang="ts">
	import { toApiError } from '#lib/client/api.ts';
	import type {
		ApiError,
		EncounterCounts,
		MatchPage,
		Participant,
		Puuid
	} from '#lib/shared/types.ts';
	import ErrorMessage from './ErrorMessage.svelte';
	import MatchRow from './MatchRow.svelte';

	let {
		initialPage,
		loadPage,
		pageSize = 20,
		loadCounts,
		onselect
	}: {
		initialPage: MatchPage;
		/** Charge la page qui commence à `start` (index dans l'historique Riot). */
		loadPage: (start: number) => Promise<MatchPage>;
		pageSize?: number;
		loadCounts?: (puuids: Puuid[]) => Promise<EncounterCounts>;
		onselect?: (participant: Participant) => void;
	} = $props();

	// Valeurs initiales seulement : la liste grandit ensuite avec « Plus de matchs ».
	// svelte-ignore state_referenced_locally
	let matches = $state<MatchSummary[]>([...initialPage.matches]);
	// svelte-ignore state_referenced_locally
	let hasMore = $state(initialPage.hasMore);
	let pagesLoaded = $state(1);
	let loading = $state(false);
	let error = $state<ApiError | null>(null);
	let expanded = $state<Record<string, boolean>>({});

	export function capture(): MatchListState {
		return $state.snapshot({ matches, hasMore, pagesLoaded, expanded });
	}

	export function restore(state: MatchListState): void {
		matches = state.matches;
		hasMore = state.hasMore;
		pagesLoaded = state.pagesLoaded;
		expanded = state.expanded;
	}

	async function loadMore() {
		loading = true;
		error = null;
		try {
			// On avance par pages Riot (et non par matchs affichés) : des matchs peuvent être omis.
			const page = await loadPage(pagesLoaded * pageSize);
			matches.push(...page.matches);
			hasMore = page.hasMore;
			pagesLoaded += 1;
		} catch (err) {
			error = toApiError(err);
		} finally {
			loading = false;
		}
	}
</script>

{#if matches.length === 0}
	<p class="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-zinc-500">
		Aucune partie récente
	</p>
{:else}
	<div class="flex flex-col gap-3">
		{#each matches as match (match.matchId)}
			<MatchRow
				{match}
				{loadCounts}
				{onselect}
				bind:expanded={
					() => expanded[match.matchId] ?? false, (value) => (expanded[match.matchId] = value)
				}
			/>
		{/each}
	</div>
{/if}

<div class="mt-4 flex flex-col items-center gap-3">
	{#if error}
		<ErrorMessage {error} />
	{/if}
	{#if loading}
		<p role="status" class="text-sm text-zinc-500">Chargement…</p>
	{:else if hasMore}
		<button
			type="button"
			onclick={loadMore}
			class="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
		>
			Plus de matchs
		</button>
	{/if}
</div>
