// Analyse construite en mémoire pour tester le calcul des parties communes.
import type { Analysis, AnalyzedMatch } from '../../../src/lib/server/analysis/store.ts';

export const REF = 'puuid-reference';
export const FRIEND = 'puuid-friend';

export function analyzedMatch(
	matchId: string,
	playedAt: string,
	overrides: Partial<AnalyzedMatch> = {}
): AnalyzedMatch {
	return {
		matchId,
		playedAt,
		queueId: 420,
		referenceChampion: 'Ahri',
		referenceSide: 'blue',
		referenceOutcome: 'win',
		others: [],
		...overrides
	};
}

export function other(
	puuid: string,
	side: 'blue' | 'red',
	gameName = puuid,
	championName = 'Garen'
) {
	return { puuid, gameName, tagLine: 'EUW', championName, side };
}

/**
 * - EUW1_1 : FRIEND même équipe, victoire
 * - EUW1_2 : FRIEND adversaire, défaite
 * - EUW1_3 : FRIEND même équipe (renommé « AncienPseudo »), partie annulée
 * - EUW1_4 : sans FRIEND
 */
export function sampleAnalysis(): Analysis {
	const matches = [
		analyzedMatch('EUW1_1', '2026-10-19T12:00:00.000Z', {
			others: [other(FRIEND, 'blue', 'Ami', 'Lux'), other('puuid-x', 'red')]
		}),
		analyzedMatch('EUW1_2', '2026-10-18T12:00:00.000Z', {
			referenceOutcome: 'loss',
			queueId: 440,
			others: [other(FRIEND, 'red', 'Ami', 'Zed'), other('puuid-x', 'blue')]
		}),
		analyzedMatch('EUW1_3', '2026-10-17T12:00:00.000Z', {
			referenceOutcome: 'remake',
			referenceSide: 'red',
			others: [other(FRIEND, 'red', 'AncienPseudo', 'Jinx')]
		}),
		analyzedMatch('EUW1_4', '2026-10-16T12:00:00.000Z', { others: [other('puuid-y', 'red')] })
	];
	return {
		schemaVersion: 1,
		puuid: REF,
		platform: 'euw1',
		lastAnalyzedAt: '2026-10-20T08:00:00.000Z',
		windowMatchIds: matches.map((m) => m.matchId),
		matches: Object.fromEntries(matches.map((m) => [m.matchId, m])),
		unavailableMatchIds: []
	};
}
