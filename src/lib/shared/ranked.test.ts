import { describe, expect, it } from 'vitest';
import {
	TIER_LABELS,
	averageRank,
	emblemUrl,
	formatRank,
	positionFromIndex,
	rankIndex,
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

describe('rankIndex / positionFromIndex', () => {
	it.each([
		['IRON', 'IV', 0],
		['EMERALD', 'IV', 20],
		['EMERALD', 'I', 23],
		['DIAMOND', 'I', 27],
		['MASTER', null, 28],
		['GRANDMASTER', null, 29],
		['CHALLENGER', null, 30]
	])('%s %s → %i', (tier, division, index) => {
		expect(rankIndex({ tier, division })).toBe(index);
		expect(positionFromIndex(index)).toEqual({ tier, division });
	});

	it('refuse un palier inconnu avec un message explicite', () => {
		expect(() => rankIndex({ tier: 'WOOD', division: 'I' })).toThrow(/WOOD/);
	});
});

function ranked(tier: string, division: string | null, leaguePoints = 0) {
	return {
		status: 'ranked' as const,
		tier,
		tierLabel: TIER_LABELS[tier] ?? tier,
		division,
		leaguePoints,
		wins: 10,
		losses: 10,
		winRate: 50
	};
}

describe('averageRank', () => {
	it('2 Émeraude IV + 3 Émeraude I → Émeraude II (exemple de référence)', () => {
		const stats = [
			ranked('EMERALD', 'IV'),
			ranked('EMERALD', 'IV'),
			ranked('EMERALD', 'I'),
			ranked('EMERALD', 'I'),
			ranked('EMERALD', 'I')
		];
		expect(averageRank(stats, 5)).toEqual({
			status: 'average',
			tier: 'EMERALD',
			tierLabel: 'Émeraude',
			division: 'II',
			counted: 5,
			teamSize: 5
		});
	});

	it('5 joueurs du même rang → ce rang', () => {
		const result = averageRank(Array(5).fill(ranked('GOLD', 'III')), 5);
		expect(result).toMatchObject({ tier: 'GOLD', division: 'III' });
	});

	it('arrondit 0,5 vers le haut (Or IV + Or III → Or III)', () => {
		const result = averageRank([ranked('GOLD', 'IV'), ranked('GOLD', 'III')], 2);
		expect(result).toMatchObject({ tier: 'GOLD', division: 'III' });
	});

	it('gère les paliers sans division : Diamant I, Maître, Grand Maître → Maître', () => {
		const result = averageRank(
			[ranked('DIAMOND', 'I'), ranked('MASTER', null), ranked('GRANDMASTER', null)],
			3
		);
		expect(result).toMatchObject({ tier: 'MASTER', tierLabel: 'Maître', division: null });
	});

	it('ignore les non classés, masqués et indisponibles et indique combien sont comptés', () => {
		const result = averageRank(
			[
				ranked('SILVER', 'II'),
				ranked('SILVER', 'II'),
				ranked('SILVER', 'II'),
				{ status: 'unranked' },
				{ status: 'unavailable' }
			],
			5
		);
		expect(result).toMatchObject({ tier: 'SILVER', division: 'II', counted: 3, teamSize: 5 });
	});

	it('ignore un palier inconnu sans planter', () => {
		const result = averageRank([ranked('GOLD', 'I'), ranked('WOOD', 'I')], 2);
		expect(result).toMatchObject({ tier: 'GOLD', division: 'I', counted: 1 });
	});

	it('est indisponible sans aucun joueur classé', () => {
		expect(averageRank([{ status: 'unranked' }], 5)).toEqual({ status: 'unavailable' });
		expect(averageRank([], 5)).toEqual({ status: 'unavailable' });
	});

	it('ignore les LP', () => {
		const a = averageRank([ranked('GOLD', 'II', 0), ranked('GOLD', 'II', 99)], 2);
		expect(a).toMatchObject({ tier: 'GOLD', division: 'II' });
	});
});
