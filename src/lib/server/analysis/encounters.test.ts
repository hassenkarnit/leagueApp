import { describe, expect, it } from 'vitest';
import { FRIEND, REF, sampleAnalysis } from '../../../../tests/fixtures/app/analysis.ts';
import { countEncounters, summarizeEncounter } from './encounters.ts';

const label = (queueId: number) => `File ${queueId}`;

describe('countEncounters (badges)', () => {
	it('ne renvoie que les joueurs déjà croisés', () => {
		expect(countEncounters(sampleAnalysis(), [FRIEND, 'puuid-x', 'puuid-inconnu'])).toEqual({
			[FRIEND]: 3,
			'puuid-x': 2
		});
	});

	it('ne compte jamais le compte de référence lui-même', () => {
		expect(countEncounters(sampleAnalysis(), [REF])).toEqual({});
	});
});

describe('summarizeEncounter', () => {
	it('sépare même équipe et adversaires, du point de vue de la référence', () => {
		const summary = summarizeEncounter(sampleAnalysis(), FRIEND, label);
		expect(summary).toMatchObject({
			otherPuuid: FRIEND,
			isSelf: false,
			total: 3,
			sameTeam: { games: 2, wins: 1, losses: 0, remakes: 1 },
			opponents: { games: 1, wins: 0, losses: 1, remakes: 0 },
			lastPlayedAt: '2026-10-19T12:00:00.000Z'
		});
	});

	it('respecte les invariants de comptage (SC-004)', () => {
		const s = summarizeEncounter(sampleAnalysis(), FRIEND, label);
		expect(s.total).toBe(s.sameTeam.games + s.opponents.games);
		for (const stats of [s.sameTeam, s.opponents]) {
			expect(stats.games).toBe(stats.wins + stats.losses + stats.remakes);
		}
		expect(new Set(s.games.map((g) => g.matchId)).size).toBe(s.games.length);
	});

	it('liste les parties communes de la plus récente à la plus ancienne', () => {
		const { games } = summarizeEncounter(sampleAnalysis(), FRIEND, label);
		expect(games).toEqual([
			{
				matchId: 'EUW1_1',
				playedAt: '2026-10-19T12:00:00.000Z',
				queueLabel: 'File 420',
				relation: 'same-team',
				referenceChampion: 'Ahri',
				otherChampion: 'Lux',
				referenceOutcome: 'win'
			},
			expect.objectContaining({ matchId: 'EUW1_2', relation: 'opponent', queueLabel: 'File 440' }),
			expect.objectContaining({ matchId: 'EUW1_3', relation: 'same-team' })
		]);
	});

	it('reconnaît un joueur renommé comme une seule personne (FR-014)', () => {
		// Dans EUW1_3, FRIEND s'appelait « AncienPseudo » : même PUUID, donc même joueur.
		expect(summarizeEncounter(sampleAnalysis(), FRIEND, label).total).toBe(3);
	});

	it('renvoie un total nul et la période pour un joueur jamais croisé (FR-013)', () => {
		const summary = summarizeEncounter(sampleAnalysis(), 'puuid-inconnu', label);
		expect(summary.total).toBe(0);
		expect(summary.lastPlayedAt).toBeNull();
		expect(summary.games).toEqual([]);
		expect(summary.period).toEqual({ analyzedCount: 4, oldestMatchAt: '2026-10-16T12:00:00.000Z' });
	});

	it('signale « C’est vous » pour le compte de référence (FR-015)', () => {
		const summary = summarizeEncounter(sampleAnalysis(), REF, label);
		expect(summary.isSelf).toBe(true);
		expect(summary.total).toBe(0);
	});
});
