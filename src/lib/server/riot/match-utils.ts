// Lecture des données de match Riot, partagée par l'historique (US1) et l'analyse (US2).
import type { MatchOutcome, TeamSide } from '#lib/shared/types.ts';
import type { MatchDto, ParticipantDto } from './schemas.ts';

export function sideOf(teamId: number): TeamSide {
	return teamId === 100 ? 'blue' : 'red';
}

export function outcomeOf(participant: ParticipantDto): MatchOutcome {
	if (participant.gameEndedInEarlySurrender) return 'remake';
	return participant.win ? 'win' : 'loss';
}

/** Bots non documentés officiellement : détection défensive (research.md R6). */
export function isBotParticipant(participant: ParticipantDto): boolean {
	return participant.puuid === 'BOT' || participant.riotIdGameName === '';
}

/** `gameDuration` est en secondes si `gameEndTimestamp` est présent, sinon en millisecondes. */
export function durationSeconds(info: MatchDto['info']): number {
	return info.gameEndTimestamp === undefined
		? Math.round(info.gameDuration / 1000)
		: info.gameDuration;
}
