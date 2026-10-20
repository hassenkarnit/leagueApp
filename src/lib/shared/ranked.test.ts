import { describe, expect, it } from 'vitest';
import {
	TIER_LABELS,
	emblemUrl,
	formatRank,
	formatRecord,
	winRate,
	winRateColor
} from './ranked.ts';

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

describe('emblemUrl', () => {
	it('renvoie le fichier embarqué du palier', () => {
		expect(emblemUrl('EMERALD')).toBe('/ranks/emerald.png');
	});

	it.each(Object.keys(TIER_LABELS))('%s a un emblème', (tier) => {
		expect(emblemUrl(tier)).toBe(`/ranks/${tier.toLowerCase()}.png`);
	});

	it.each([[null], ['UNKNOWN']])('%s → null', (tier) => {
		expect(emblemUrl(tier)).toBeNull();
	});
});

/** Teinte (0–360) extraite d'une chaîne `hsl(<h> …)`. */
function hue(color: string): number {
	const match = /^hsl\((\d+(?:\.\d+)?)/.exec(color);
	if (!match) throw new Error(`couleur inattendue : ${color}`);
	return Number(match[1]);
}

describe('winRateColor', () => {
	it('est rouge franc à 45 % et en dessous, identique', () => {
		expect(hue(winRateColor(45, 55))).toBe(0);
		expect(winRateColor(30, 70)).toBe(winRateColor(45, 55));
	});

	it('est jaune à 50 %', () => {
		expect(hue(winRateColor(108, 108))).toBe(48);
	});

	it('est vert franc à 52 % et au-dessus, identique', () => {
		expect(hue(winRateColor(52, 48))).toBe(130);
		expect(winRateColor(60, 40)).toBe(winRateColor(52, 48));
	});

	it('glisse vers le rouge sous 50 % (47 % plus rouge que 49 %)', () => {
		expect(hue(winRateColor(47, 53))).toBeLessThan(hue(winRateColor(49, 51)));
		expect(hue(winRateColor(49, 51))).toBeLessThan(48);
	});

	it('glisse vers le vert au-dessus de 50 % (51 % plus vert que 50,5 %)', () => {
		expect(hue(winRateColor(51, 49))).toBeGreaterThan(hue(winRateColor(101, 99)));
		expect(hue(winRateColor(101, 99))).toBeGreaterThan(48);
	});

	it('est monotone de 45 % à 52 % (pourcentage exact, non arrondi)', () => {
		const hues = [45, 46, 47, 48, 49, 50, 51, 52].map((pct) => hue(winRateColor(pct, 100 - pct)));
		expect(hues).toEqual([...hues].sort((a, b) => a - b));
		expect(new Set(hues).size).toBe(hues.length);
	});
});
