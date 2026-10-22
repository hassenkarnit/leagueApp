// Partie en cours et niveau des joueurs (feature 002, specs/002-live-game-card).
import { APEX_TIERS, TIER_LABELS, winRate } from '#lib/shared/ranked.ts';
import type {
	LiveGameResult,
	LiveParticipant,
	LiveTeam,
	Platform,
	Puuid,
	RankedStats,
	RankedStatsMap
} from '#lib/shared/types.ts';
import { TtlCache } from './cache.ts';
import type { RiotClient } from './riot/client.ts';
import { sideOf } from './riot/match-utils.ts';
import type { ActiveParticipantDto, LeagueEntryDto } from './riot/schemas.ts';
import type { StaticData } from './static-data.ts';

const RANKED_TTL_MS = 10 * 60 * 1000;

export interface LiveGameServiceOptions {
	riot: RiotClient;
	staticData: StaticData;
	now?: () => number;
}

/** « Le Joueur#EUW » → { gameName: 'Le Joueur', tagLine: 'EUW' } (découpe sur le dernier #). */
function splitRiotId(riotId: string): { gameName: string; tagLine: string } {
	const index = riotId.lastIndexOf('#');
	return index === -1
		? { gameName: riotId, tagLine: '' }
		: { gameName: riotId.slice(0, index), tagLine: riotId.slice(index + 1) };
}

/** Rang Solo/Duo à partir des entrées league-v4 ; aucune entrée Solo/Duo → « unranked ». */
function toRankedStats(entries: LeagueEntryDto[]): RankedStats {
	const solo = entries.find((e) => e.queueType === 'RANKED_SOLO_5x5');
	if (!solo || solo.wins + solo.losses === 0) return { status: 'unranked' };
	return {
		status: 'ranked',
		tier: solo.tier,
		tierLabel: TIER_LABELS[solo.tier] ?? solo.tier,
		division: APEX_TIERS.has(solo.tier) ? null : solo.rank,
		leaguePoints: solo.leaguePoints,
		wins: solo.wins,
		losses: solo.losses,
		winRate: winRate(solo.wins, solo.losses)
	};
}

export function createLiveGameService({
	riot,
	staticData,
	now = Date.now
}: LiveGameServiceOptions) {
	// Un échec n'est jamais mis en cache (getOrLoad ne garde que les succès).
	const rankedCache = new TtlCache<string, RankedStats>({ ttlMs: RANKED_TTL_MS, now });

	async function toLiveParticipant(dto: ActiveParticipantDto): Promise<LiveParticipant> {
		const champion = await staticData.getChampion(dto.championId);
		const isHidden = dto.puuid === null;
		return {
			puuid: dto.puuid,
			isHidden,
			...(isHidden ? { gameName: '', tagLine: '' } : splitRiotId(dto.riotId)),
			championName: champion.name,
			championIconUrl: champion.iconUrl,
			side: sideOf(dto.teamId)
		};
	}

	return {
		/** Jamais en cache : l'utilisateur clique justement pour une information fraîche (FR-001). */
		async getLiveGame(platform: Platform, puuid: Puuid): Promise<LiveGameResult> {
			const game = await riot.getActiveGame(puuid, platform, 'interactive');
			if (!game) return { state: 'not-in-game' };

			// Tous les modes affichent la card (spec 002, clarification du 2026-10-23).
			const queueLabel = await staticData.getQueueLabel(game.gameQueueConfigId);
			const teams = await Promise.all(
				([100, 200] as const).map(async (teamId): Promise<LiveTeam> => ({
					side: sideOf(teamId),
					participants: await Promise.all(
						game.participants.filter((p) => p.teamId === teamId).map(toLiveParticipant)
					)
				}))
			);

			return {
				state: 'in-game',
				game: {
					gameId: game.gameId,
					queueLabel,
					startedAt: game.gameStartTime > 0 ? new Date(game.gameStartTime).toISOString() : null,
					teams: [teams[0], teams[1]]
				}
			};
		},

		/** Rang et % de victoires Solo/Duo ; un joueur en erreur devient « unavailable » (FR-015). */
		async getRankedStats(platform: Platform, puuids: Puuid[]): Promise<RankedStatsMap> {
			const results = await Promise.allSettled(
				puuids.map((puuid) =>
					rankedCache.getOrLoad(`${platform}:${puuid}`, async () =>
						toRankedStats(await riot.getLeagueEntries(puuid, platform, 'interactive'))
					)
				)
			);
			return Object.fromEntries(
				puuids.map((puuid, i) => {
					const result = results[i];
					return [
						puuid,
						result.status === 'fulfilled' ? result.value : { status: 'unavailable' as const }
					];
				})
			);
		}
	};
}

export type LiveGameService = ReturnType<typeof createLiveGameService>;
