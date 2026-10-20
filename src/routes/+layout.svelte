<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { navigating } from '$app/state';
	import { getAnalysisStatus, getProfile, startAnalysis } from '#lib/client/endpoints.ts';
	import { reference } from '#lib/client/reference.svelte.ts';
	import AnalysisControl from '#lib/components/AnalysisControl.svelte';
	import LegalFooter from '#lib/components/LegalFooter.svelte';
	import ReferenceAccount from '#lib/components/ReferenceAccount.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Le compte de référence vit dans le navigateur : on ne l'affiche qu'après le chargement côté client.
	let mounted = $state(false);
	onMount(() => (mounted = true));

	const analysisApi = { getStatus: getAnalysisStatus, start: startAnalysis };
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>LeagueApp</title>
</svelte:head>

{#if navigating.to}
	<!-- Indicateur de chargement global pendant une navigation (FR-019). -->
	<div
		class="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-indigo-500"
		role="progressbar"
		aria-label="Chargement"
	></div>
{/if}

<div class="min-h-screen bg-zinc-50 text-zinc-900">
	<div class="mx-auto flex max-w-4xl flex-col px-4">
		<header class="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 py-4">
			<a href={resolve('/')} class="text-lg font-semibold tracking-tight hover:text-indigo-600"
				>LeagueApp</a
			>
			{#if mounted}
				<div class="flex flex-col items-end gap-2">
					<ReferenceAccount store={reference} lookup={getProfile} />
					{#if reference.current}
						{#key reference.current.puuid}
							<AnalysisControl reference={reference.current} api={analysisApi} />
						{/key}
					{/if}
				</div>
			{/if}
		</header>

		<main class="py-8">
			{@render children()}
		</main>

		<LegalFooter />
	</div>
</div>
