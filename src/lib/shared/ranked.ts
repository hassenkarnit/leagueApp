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

/** Palier + division, sans LP : ce qui compte pour l'échelle et la moyenne. */
export type RankPosition = { tier: string; division: string | null };

/** Rang moyen d'une équipe : `counted` joueurs classés sur `teamSize`. */
export type TeamAverageRank =
	| {
			status: 'average';
			tier: string;
			tierLabel: string;
			division: string | null;
			counted: number;
			teamSize: number;
	  }
	| { status: 'unavailable' };

// Fer IV = 0 … Diamant I = 27, puis Maître = 28, Grand Maître = 29, Challenger = 30.
const DIVIDED_TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND'];
const APEX_ORDER = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];
const DIVISIONS = ['IV', 'III', 'II', 'I'];
const FIRST_APEX_INDEX = DIVIDED_TIERS.length * DIVISIONS.length;

/** Position d'un rang sur l'échelle 0–30 ; palier ou division inconnus → erreur explicite. */
export function rankIndex({ tier, division }: RankPosition): number {
	const apex = APEX_ORDER.indexOf(tier);
	if (apex !== -1) return FIRST_APEX_INDEX + apex;
	const tierIndex = DIVIDED_TIERS.indexOf(tier);
	const divisionIndex = division === null ? -1 : DIVISIONS.indexOf(division);
	if (tierIndex === -1 || divisionIndex === -1) {
		throw new Error(`Rang inconnu : ${tier} ${division ?? ''}`.trim());
	}
	return tierIndex * DIVISIONS.length + divisionIndex;
}

/** Réciproque de `rankIndex`. */
export function positionFromIndex(index: number): RankPosition {
	if (index >= FIRST_APEX_INDEX)
		return { tier: APEX_ORDER[index - FIRST_APEX_INDEX], division: null };
	return {
		tier: DIVIDED_TIERS[Math.floor(index / DIVISIONS.length)],
		division: DIVISIONS[index % DIVISIONS.length]
	};
}

type PlayerStats = { status: 'ranked'; tier: string; division: string | null } | { status: string };

/** Moyenne des joueurs classés (non classés, indisponibles et paliers inconnus ignorés), 0,5 arrondi vers le haut. */
export function averageRank(stats: PlayerStats[], teamSize: number): TeamAverageRank {
	const indexes: number[] = [];
	for (const entry of stats) {
		if (entry.status !== 'ranked') continue;
		try {
			indexes.push(rankIndex(entry as RankPosition));
		} catch {
			// palier inconnu : traité comme un joueur non classé
		}
	}
	if (indexes.length === 0) return { status: 'unavailable' };
	const mean = indexes.reduce((sum, index) => sum + index, 0) / indexes.length;
	const { tier, division } = positionFromIndex(Math.floor(mean + 0.5));
	return {
		status: 'average',
		tier,
		tierLabel: TIER_LABELS[tier],
		division,
		counted: indexes.length,
		teamSize
	};
}
