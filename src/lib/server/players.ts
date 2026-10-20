// Profil et historique paginé d'un joueur (User Story 1).
import { parseUrlSegment } from '#lib/shared/riot-id.ts';
import type {
	MatchOutcome,
	MatchPage,
	MatchSummary,
	Participant,
	Platform,
	PlayerProfile,
	Puuid,
	RiotId,
	Team,
	TeamSide
} from '#lib/shared/types.ts';
import { TtlCache } from './cache.ts';
import { errors } from './errors.ts';
import { MatchUnavailableError, type RiotClient } from './riot/client.ts';
import { regionsFor } from './riot/routing.ts';
import type { MatchDto, ParticipantDto } from './riot/schemas.ts';
import type { StaticData } from './static-data.ts';

const MINUTE_MS = 60 * 1000;

export interface PlayersServiceOptions {
	riot: RiotClient;
	staticData: StaticData;
	now?: () => number;
}

/** Valide un segment d'URL « gameName-tagLine » (déjà décodé par SvelteKit). */
export function parseRiotIdParam(segment: string): RiotId {
	const result = parseUrlSegment(segment);
	if (!result.ok) throw errors.invalidRiotId();
	return result.value;
}

/** Valide la plateforme d'une URL et la renvoie typée. */
export function parsePlatformParam(platform: string): Platform {
	regionsFor(platform);
	return platform as Platform;
}

function sideOf(teamId: number): TeamSide {
	return teamId === 100 ? 'blue' : 'red';
}

function outcomeOf(participant: ParticipantDto): MatchOutcome {
	if (participant.gameEndedInEarlySurrender) return 'remake';
	return participant.win ? 'win' : 'loss';
}

export function isBotParticipant(participant: ParticipantDto): boolean {
	return participant.puuid === 'BOT' || participant.riotIdGameName === '';
}

/** `gameDuration` est en secondes si `gameEndTimestamp` est présent, sinon en millisecondes. */
function durationSeconds(info: MatchDto['info']): number {
	return info.gameEndTimestamp === undefined
		? Math.round(info.gameDuration / 1000)
		: info.gameDuration;
}

export function createPlayersService({ riot, staticData, now = Date.now }: PlayersServiceOptions) {
	const accounts = new TtlCache<string, { puuid: Puuid; gameName: string; tagLine: string }>({
		ttlMs: 60 * MINUTE_MS,
		now
	});
	const summoners = new TtlCache<string, { profileIconId: number; summonerLevel: number }>({
		ttlMs: 5 * MINUTE_MS,
		now
	});
	const matchIds = new TtlCache<string, string[]>({ ttlMs: 5 * MINUTE_MS, now });
	// Un match terminé ne change jamais : cache illimité dans le temps, borné en taille.
	const matches = new TtlCache<string, MatchDto>({ ttlMs: Infinity, maxEntries: 1000, now });

	function getAccount(platform: Platform, riotId: RiotId) {
		const key =
			`${regionsFor(platform).account}:${riotId.gameName}#${riotId.tagLine}`.toLowerCase();
		return accounts.getOrLoad(key, async () => {
			const account = await riot.getAccountByRiotId(riotId, platform, 'interactive');
			return {
				puuid: account.puuid,
				gameName: account.gameName ?? riotId.gameName,
				tagLine: account.tagLine ?? riotId.tagLine
			};
		});
	}

	async function toParticipant(dto: ParticipantDto): Promise<Participant> {
		const isBot = isBotParticipant(dto);
		return {
			puuid: isBot ? null : dto.puuid,
			gameName: isBot ? null : dto.riotIdGameName,
			tagLine: isBot ? null : dto.riotIdTagline,
			isBot,
			championName: dto.championName,
			championIconUrl: await staticData.championIconUrl(dto.championName),
			side: sideOf(dto.teamId),
			kills: dto.kills,
			deaths: dto.deaths,
			assists: dto.assists
		};
	}

	async function toMatchSummary(match: MatchDto, puuid: Puuid): Promise<MatchSummary | null> {
		const { info } = match;
		const own = info.participants.find((p) => p.puuid === puuid);
		if (!own) return null;

		const teams = await Promise.all(
			([100, 200] as const).map(async (teamId): Promise<Team> => {
				const members = info.participants.filter((p) => p.teamId === teamId);
				return {
					side: sideOf(teamId),
					outcome: members.length > 0 ? outcomeOf(members[0]) : 'loss',
					participants: await Promise.all(members.map(toParticipant))
				};
			})
		);

		return {
			matchId: match.metadata.matchId,
			queueLabel: await staticData.getQueueLabel(info.queueId),
			playedAt: new Date(info.gameStartTimestamp).toISOString(),
			durationSeconds: durationSeconds(info),
			player: await toParticipant(own),
			outcome: outcomeOf(own),
			teams: [teams[0], teams[1]]
		};
	}

	return {
		async getProfile(platformParam: string, riotId: RiotId): Promise<PlayerProfile> {
			const platform = parsePlatformParam(platformParam);
			const account = await getAccount(platform, riotId);
			const summoner = await summoners.getOrLoad(`${platform}:${account.puuid}`, () =>
				riot.getSummonerByPuuid(account.puuid, platform, 'interactive')
			);
			return {
				puuid: account.puuid,
				gameName: account.gameName,
				tagLine: account.tagLine,
				platform,
				profileIconUrl: await staticData.profileIconUrl(summoner.profileIconId),
				summonerLevel: summoner.summonerLevel
			};
		},

		async getMatchPage(
			platformParam: string,
			riotId: RiotId,
			start: number,
			count: number
		): Promise<MatchPage> {
			const platform = parsePlatformParam(platformParam);
			const { puuid } = await getAccount(platform, riotId);
			const ids = await matchIds.getOrLoad(`${platform}:${puuid}:${start}:${count}`, () =>
				riot.getMatchIds(puuid, platform, { start, count }, 'interactive')
			);

			const results = await Promise.allSettled(
				ids.map((id) => matches.getOrLoad(id, () => riot.getMatch(id, platform, 'interactive')))
			);

			const summaries: MatchSummary[] = [];
			let skipped = 0;
			for (const result of results) {
				if (result.status === 'rejected') {
					if (result.reason instanceof MatchUnavailableError) {
						skipped += 1;
						continue;
					}
					throw result.reason;
				}
				const summary = await toMatchSummary(result.value, puuid);
				if (summary) summaries.push(summary);
				else skipped += 1;
			}

			return { matches: summaries, hasMore: ids.length === count, skipped };
		}
	};
}

export type PlayersService = ReturnType<typeof createPlayersService>;
