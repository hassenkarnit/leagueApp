import { describe, expect, it } from 'vitest';
import { TIER_LABELS, formatRank, formatRecord, winRate } from './ranked.ts';

describe('winRate', () => {
	it.each([
		[120, 102, 54],
		[448, 371, 55],
		[1, 0, 100],
		[0, 3, 0],
		[1, 2, 33]
	])('%i V / %i D → %i %', (wins, losses, expected) => {
		expect(winRate(wins, losses)).toBe(expected);
	});
});

describe('formatRank', () => {
	it('affiche palier, division et LP', () => {
		expect(formatRank({ tier: 'PLATINUM', division: 'II', leaguePoints: 45 })).toBe(
			'Platine II · 45 LP'
		);
	});

	it.each(['MASTER', 'GRANDMASTER', 'CHALLENGER'])('masque la division pour %s', (tier) => {
		expect(formatRank({ tier, division: null, leaguePoints: 2256 })).toBe(
			`${TIER_LABELS[tier]} · 2256 LP`
		);
	});
});

describe('formatRecord', () => {
	it('affiche « 54 % · 120 V / 102 D »', () => {
		expect(formatRecord({ wins: 120, losses: 102, winRate: 54 })).toBe('54 % · 120 V / 102 D');
	});
});

describe('TIER_LABELS', () => {
	it('traduit les 10 paliers', () => {
		expect(TIER_LABELS).toEqual({
			IRON: 'Fer',
			BRONZE: 'Bronze',
			SILVER: 'Argent',
			GOLD: 'Or',
			PLATINUM: 'Platine',
			EMERALD: 'Émeraude',
			DIAMOND: 'Diamant',
			MASTER: 'Maître',
			GRANDMASTER: 'Grand Maître',
			CHALLENGER: 'Challenger'
		});
	});
});
