<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SearchForm from '#lib/components/SearchForm.svelte';
	import { toUrlSegment } from '#lib/shared/riot-id.ts';
	import type { Platform, RiotId } from '#lib/shared/types.ts';

	function openPlayer(platform: Platform, riotId: RiotId) {
		goto(resolve('/joueur/[platform]/[riotId]', { platform, riotId: toUrlSegment(riotId) }));
	}
</script>

<section class="space-y-6">
	<div class="space-y-2">
		<h1 class="text-2xl font-semibold tracking-tight">Retrouve un joueur League of Legends</h1>
		<p class="text-zinc-600">
			Recherche un joueur par son Riot ID pour voir son historique, et découvre si tu as déjà joué
			avec les joueurs que tu croises.
		</p>
	</div>
	<SearchForm onsearch={openPlayer} />
</section>
