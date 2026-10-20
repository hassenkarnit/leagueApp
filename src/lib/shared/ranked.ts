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

/** Emblème embarqué (`static/ranks/`) d'un palier ; `null` si le palier est inconnu. */
export function emblemUrl(tier: string | null): string | null {
	return tier !== null && tier in TIER_LABELS ? `/ranks/${tier.toLowerCase()}.png` : null;
}

const HUE_RED = 0;
const HUE_YELLOW = 48;
const HUE_GREEN = 130;
/** Rouge franc à 45 % et moins, jaune à 50 %, vert franc à 52 % et plus (feature 003, R3). */
const RED_AT = 45;
const YELLOW_AT = 50;
const GREEN_AT = 52;

/** Couleur CSS du pourcentage de victoires exact (non arrondi), rouge → jaune → vert. */
export function winRateColor(wins: number, losses: number): string {
	const percent = Math.min(GREEN_AT, Math.max(RED_AT, (wins / (wins + losses)) * 100));
	const hue =
		percent <= YELLOW_AT
			? HUE_RED + ((HUE_YELLOW - HUE_RED) * (percent - RED_AT)) / (YELLOW_AT - RED_AT)
			: HUE_YELLOW + ((HUE_GREEN - HUE_YELLOW) * (percent - YELLOW_AT)) / (GREEN_AT - YELLOW_AT);
	return `hsl(${Math.round(hue * 10) / 10} 85% 36%)`;
}
