// Classement Solo/Duo : libellés français et formats d'affichage (feature 002, research.md R3).

export const TIER_LABELS: Record<string, string> = {
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
};

/** Paliers sans division (Maître et au-dessus). */
export const APEX_TIERS = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER']);

/** round(victoires / (victoires + défaites) × 100) — SC-006. */
export function winRate(wins: number, losses: number): number {
	return Math.round((wins / (wins + losses)) * 100);
}

/** « Platine II · 45 LP », « Challenger · 2256 LP » */
export function formatRank({
	tier,
	division,
	leaguePoints
}: {
	tier: string;
	division: string | null;
	leaguePoints: number;
}): string {
	const label = TIER_LABELS[tier] ?? tier;
	return `${division ? `${label} ${division}` : label} · ${leaguePoints} LP`;
}

/** « 54 % · 120 V / 102 D » */
export function formatRecord({
	wins,
	losses,
	winRate
}: {
	wins: number;
	losses: number;
	winRate: number;
}): string {
	return `${winRate} % · ${wins} V / ${losses} D`;
}
