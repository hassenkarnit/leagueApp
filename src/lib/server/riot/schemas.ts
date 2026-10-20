// Validation des réponses Riot à la frontière (principe VI) : on ne suppose jamais le format correct.
// Seuls les champs utilisés sont déclarés ; les autres sont ignorés.
import { z } from 'zod';

export const AccountDto = z.object({
	puuid: z.string().min(1),
	gameName: z.string().optional(),
	tagLine: z.string().optional()
});
export type AccountDto = z.infer<typeof AccountDto>;

export const SummonerDto = z.object({
	puuid: z.string().min(1),
	profileIconId: z.number().int(),
	summonerLevel: z.number().int(),
	revisionDate: z.number()
});
export type SummonerDto = z.infer<typeof SummonerDto>;

export const MatchIdsDto = z.array(z.string());

export const ParticipantDto = z.object({
	puuid: z.string(),
	riotIdGameName: z.string().optional().default(''),
	riotIdTagline: z.string().optional().default(''),
	championName: z.string(),
	teamId: z.number().int(),
	win: z.boolean(),
	kills: z.number().int(),
	deaths: z.number().int(),
	assists: z.number().int(),
	gameEndedInEarlySurrender: z.boolean().optional().default(false)
});
export type ParticipantDto = z.infer<typeof ParticipantDto>;

export const MatchDto = z.object({
	metadata: z.object({ matchId: z.string() }),
	info: z.object({
		gameStartTimestamp: z.number(),
		gameEndTimestamp: z.number().optional(),
		gameDuration: z.number(),
		queueId: z.number().int(),
		participants: z.array(ParticipantDto)
	})
});
export type MatchDto = z.infer<typeof MatchDto>;

// --- Feature 002 : partie en cours (spectator-v5) et classement (league-v4) ---

export const ActiveParticipantDto = z.object({
	/** `null` pour un joueur masqué par Riot ; son `riotId` est alors le nom du champion. */
	puuid: z.string().nullable(),
	riotId: z.string(),
	championId: z.number().int(),
	teamId: z.number().int(),
	bot: z.boolean().optional().default(false)
});
export type ActiveParticipantDto = z.infer<typeof ActiveParticipantDto>;

export const ActiveGameDto = z.object({
	gameId: z.number(),
	gameQueueConfigId: z.number().int(),
	/** epoch ms ; 0 pendant l'écran de chargement. */
	gameStartTime: z.number(),
	participants: z.array(ActiveParticipantDto)
});
export type ActiveGameDto = z.infer<typeof ActiveGameDto>;

export const LeagueEntryDto = z.object({
	queueType: z.string(),
	tier: z.string(),
	rank: z.string(),
	leaguePoints: z.number().int(),
	wins: z.number().int(),
	losses: z.number().int()
});
export type LeagueEntryDto = z.infer<typeof LeagueEntryDto>;
