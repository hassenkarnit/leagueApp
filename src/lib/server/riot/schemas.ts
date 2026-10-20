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
