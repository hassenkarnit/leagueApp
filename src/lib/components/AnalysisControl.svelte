<script lang="ts">
	import { toApiError } from '#lib/client/api.ts';
	import { formatRelativeDate } from '#lib/shared/format.ts';
	import type {
		AnalysisStatus,
		ApiError,
		Platform,
		Puuid,
		ReferenceAccount
	} from '#lib/shared/types.ts';
	import ErrorMessage from './ErrorMessage.svelte';

	let {
		reference,
		api,
		pollIntervalMs = 1000,
		now = Date.now
	}: {
		reference: ReferenceAccount;
		api: {
			getStatus: (puuid: Puuid) => Promise<AnalysisStatus>;
			start: (puuid: Puuid, platform: Platform) => Promise<AnalysisStatus>;
		};
		pollIntervalMs?: number;
		now?: () => number;
	} = $props();

	let status = $state<AnalysisStatus | null>(null);
	let requestError = $state<ApiError | null>(null);

	const running = $derived(status?.state === 'running');
	const error = $derived(requestError ?? (status?.state === 'failed' ? status.error : null));

	async function refresh() {
		try {
			status = await api.getStatus(reference.puuid);
			requestError = null;
		} catch (err) {
			requestError = toApiError(err);
		}
	}

	async function start() {
		try {
			status = await api.start(reference.puuid, reference.platform);
			requestError = null;
		} catch (err) {
			requestError = toApiError(err);
		}
	}

	// Au chargement : lance l'analyse sans attendre de clic. Le serveur ne redemande à Riot que
	// les nouveaux matchs (ceux déjà stockés ne sont pas rechargés). Pas de relance automatique
	// après un échec (clé expirée…) : le bouton reste là pour réessayer.
	async function load() {
		await refresh();
		if (status && status.state !== 'running' && status.state !== 'failed') await start();
	}

	// Au chargement, puis à chaque changement de compte de référence.
	$effect(() => {
		void reference.puuid;
		status = null;
		load();
	});

	// Interroge l'état toutes les secondes tant que l'analyse tourne (FR-012a).
	$effect(() => {
		if (!running) return;
		const timer = setInterval(refresh, pollIntervalMs);
		return () => clearInterval(timer);
	});
</script>

<div class="flex flex-col items-end gap-1 text-xs text-zinc-600">
	<div class="flex items-center gap-2">
		{#if running && status}
			<span class="tabular-nums" aria-live="polite"
				>{status.processed} / {status.total} parties analysées</span
			>
		{:else if status?.lastAnalyzedAt}
			<span
				>Dernière analyse : {formatRelativeDate(status.lastAnalyzedAt, now())} · {status.analyzedCount}
				parties</span
			>
		{/if}
		<button
			type="button"
			onclick={start}
			disabled={running || status === null}
			class="rounded-md border border-zinc-300 bg-white px-2 py-1 font-medium text-zinc-800 hover:bg-zinc-100 focus:ring-2 focus:ring-indigo-300 focus:outline-none disabled:opacity-50"
		>
			{running ? 'Analyse en cours…' : 'Analyser mon historique'}
		</button>
	</div>
	{#if error}
		<ErrorMessage {error} />
	{/if}
</div>
