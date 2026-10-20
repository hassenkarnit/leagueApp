// Appels vers notre API REST, regroupés (voir contracts/api.openapi.yaml).
import { toUrlSegment } from '#lib/shared/riot-id.ts';
import type {
	AnalysisStatus,
	EncounterCounts,
	EncounterSummary,
	Platform,
	PlayerProfile,
	Puuid,
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
