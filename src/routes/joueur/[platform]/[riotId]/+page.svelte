<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { apiGet } from '#lib/client/api.ts';
	import ErrorMessage from '#lib/components/ErrorMessage.svelte';
	import MatchList from '#lib/components/MatchList.svelte';
	import PlayerHeader from '#lib/components/PlayerHeader.svelte';
	import SearchForm from '#lib/components/SearchForm.svelte';
	import { isPlatform } from '#lib/shared/platforms.ts';
	import { formatRiotId, toUrlSegment } from '#lib/shared/riot-id.ts';
	import type { MatchPage, Platform, RiotId } from '#lib/shared/types.ts';
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
	{/if}

	{#if data.firstPage}
		<section aria-label="Historique des matchs">
			<!-- Nouvelle liste à chaque joueur : son état (pages chargées) ne doit pas être réutilisé. -->
			{#key data.apiBase}
				<MatchList initialPage={data.firstPage} {loadPage} />
			{/key}
		</section>
	{/if}
</div>
