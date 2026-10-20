// Calcul des parties communes à partir de l'analyse : fonctions pures, aucun appel à Riot.
import type {
	EncounterCounts,
	EncounterGame,
	EncounterStats,
	EncounterSummary,
	MatchOutcome,
	Puuid
} from '#lib/shared/types.ts';
import type { Analysis, AnalyzedMatch } from './store.ts';

function newestFirst(matches: AnalyzedMatch[]): AnalyzedMatch[] {
	return [...matches].sort((a, b) => b.playedAt.localeCompare(a.playedAt));
}

function period(analysis: Analysis): EncounterSummary['period'] {
	const dates = Object.values(analysis.matches).map((m) => m.playedAt);
	return {
		analyzedCount: dates.length,
		oldestMatchAt: dates.length > 0 ? dates.reduce((a, b) => (a < b ? a : b)) : null
	};
}

function emptyStats(): EncounterStats {
	return { games: 0, wins: 0, losses: 0, remakes: 0 };
}

function record(stats: EncounterStats, outcome: MatchOutcome): void {
	stats.games += 1;
	if (outcome === 'win') stats.wins += 1;
	else if (outcome === 'loss') stats.losses += 1;
	else stats.remakes += 1;
}

/** Badges 👥 : nombre de parties communes par joueur ; les joueurs jamais croisés sont absents. */
export function countEncounters(analysis: Analysis, puuids: Puuid[]): EncounterCounts {
	const wanted = new Set(puuids.filter((p) => p !== analysis.puuid));
	const counts: EncounterCounts = {};
	for (const match of Object.values(analysis.matches)) {
		for (const other of match.others) {
			if (wanted.has(other.puuid)) counts[other.puuid] = (counts[other.puuid] ?? 0) + 1;
		}
	}
	return counts;
}

/** Résumé détaillé des parties communes avec un joueur (FR-010, FR-011, FR-013, FR-015). */
export function summarizeEncounter(
	analysis: Analysis,
	otherPuuid: Puuid,
	queueLabel: (queueId: number) => string
): EncounterSummary {
	const sameTeam = emptyStats();
	const opponents = emptyStats();
	const games: EncounterGame[] = [];

	if (otherPuuid !== analysis.puuid) {
		for (const match of newestFirst(Object.values(analysis.matches))) {
			// Comparaison par PUUID : un joueur renommé reste le même joueur (FR-014).
			const other = match.others.find((o) => o.puuid === otherPuuid);
			if (!other) continue;
			const relation = other.side === match.referenceSide ? 'same-team' : 'opponent';
			record(relation === 'same-team' ? sameTeam : opponents, match.referenceOutcome);
			games.push({
				matchId: match.matchId,
				playedAt: match.playedAt,
				queueLabel: queueLabel(match.queueId),
				relation,
				referenceChampion: match.referenceChampion,
				otherChampion: other.championName,
				referenceOutcome: match.referenceOutcome
			});
		}
	}

	return {
		otherPuuid,
		isSelf: otherPuuid === analysis.puuid,
		total: games.length,
		sameTeam,
		opponents,
		lastPlayedAt: games[0]?.playedAt ?? null,
		games,
		period: period(analysis)
	};
}

/** Pour l'état de l'analyse : début de la période analysée. */
export function oldestMatchAt(analysis: Analysis): string | null {
	return period(analysis).oldestMatchAt;
}
