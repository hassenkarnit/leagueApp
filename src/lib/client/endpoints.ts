// Appels vers notre API REST, regroupés (voir contracts/api.openapi.yaml).
import { toUrlSegment } from '#lib/shared/riot-id.ts';
import type {
	AnalysisStatus,
	EncounterCounts,
	EncounterSummary,
	LiveGameResult,
	Platform,
	PlayerProfile,
	Puuid,
	RankedStatsMap,
	RecurringPlayer,
	RiotId
} from '#lib/shared/types.ts';
import { apiGet, apiPost } from './api.ts';

const enc = encodeURIComponent;

export function getProfile(platform: Platform, riotId: RiotId): Promise<PlayerProfile> {
	return apiGet(`/api/players/${enc(platform)}/${enc(decodeURIComponent(toUrlSegment(riotId)))}`);
}

export function getAnalysisStatus(puuid: Puuid): Promise<AnalysisStatus> {
	return apiGet(`/api/reference/${enc(puuid)}/analysis`);
}

export function startAnalysis(puuid: Puuid, platform: Platform): Promise<AnalysisStatus> {
	return apiPost(`/api/reference/${enc(puuid)}/analysis`, { platform });
}

export async function getEncounterCounts(
	referencePuuid: Puuid,
	puuids: Puuid[]
): Promise<EncounterCounts> {
	const query = puuids.map(enc).join(',');
	const { counts } = await apiGet<{ counts: EncounterCounts }>(
		`/api/reference/${enc(referencePuuid)}/encounters?with=${query}`
	);
	return counts;
}

export function getEncounterSummary(
	referencePuuid: Puuid,
	otherPuuid: Puuid
): Promise<EncounterSummary> {
	return apiGet(`/api/reference/${enc(referencePuuid)}/encounters/${enc(otherPuuid)}`);
}

/** Joueurs croisés au moins 2 fois par le compte de référence. */
export async function getRecurringPlayers(referencePuuid: Puuid): Promise<RecurringPlayer[]> {
	const { players } = await apiGet<{ players: RecurringPlayer[] }>(
		`/api/reference/${enc(referencePuuid)}/recurring`
	);
	return players;
}

/** Partie en cours (feature 002). `apiBase` = « /api/players/{platform}/{riotId} ». */
export function getLiveGame(apiBase: string): Promise<LiveGameResult> {
	return apiGet(`${apiBase}/live-game`);
}

/** Rang et % de victoires Solo/Duo de plusieurs joueurs (feature 002). */
export async function getRankedStats(platform: Platform, puuids: Puuid[]): Promise<RankedStatsMap> {
	const { stats } = await apiGet<{ stats: RankedStatsMap }>(
		`/api/ranked/${enc(platform)}?puuids=${puuids.map(enc).join(',')}`
	);
	return stats;
}
