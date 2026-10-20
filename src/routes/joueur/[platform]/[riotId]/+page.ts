import { apiGet, toApiError } from '#lib/client/api.ts';
import type { MatchPage, PlayerProfile } from '#lib/shared/types.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch, url }) => {
	const apiBase = `/api/players/${encodeURIComponent(params.platform)}/${encodeURIComponent(params.riotId)}`;

	// Lancés en parallèle : le serveur ne résout le compte Riot qu'une fois (cache partagé).
	const [profile, firstPage] = await Promise.allSettled([
		apiGet<PlayerProfile>(apiBase, fetch),
		apiGet<MatchPage>(`${apiBase}/matches?start=0&count=20`, fetch)
	]);

	const failure = [profile, firstPage].find((r) => r.status === 'rejected');
	return {
		apiBase,
		/** Arrivée depuis « Voir le profil » dans un match (message dédié si le joueur a changé de pseudo). */
		fromMatch: url.searchParams.get('from') === 'match',
		profile: profile.status === 'fulfilled' ? profile.value : null,
		firstPage: firstPage.status === 'fulfilled' ? firstPage.value : null,
		error: failure ? toApiError(failure.reason) : null
	};
};
