import type { Platform } from './types.ts';

/** Serveurs proposés dans la liste déroulante (PH2 et TH2 ont fusionné dans SG2 en 2025). */
export const PLATFORMS: ReadonlyArray<{ id: Platform; label: string }> = [
	{ id: 'euw1', label: 'Europe Ouest (EUW)' },
	{ id: 'eun1', label: 'Europe Nord & Est (EUNE)' },
	{ id: 'tr1', label: 'Turquie (TR)' },
	{ id: 'ru', label: 'Russie (RU)' },
	{ id: 'me1', label: 'Moyen-Orient (ME)' },
	{ id: 'na1', label: 'Amérique du Nord (NA)' },
	{ id: 'br1', label: 'Brésil (BR)' },
	{ id: 'la1', label: 'Amérique latine Nord (LAN)' },
	{ id: 'la2', label: 'Amérique latine Sud (LAS)' },
	{ id: 'kr', label: 'Corée (KR)' },
	{ id: 'jp1', label: 'Japon (JP)' },
	{ id: 'oc1', label: 'Océanie (OCE)' },
	{ id: 'sg2', label: 'Asie du Sud-Est (SEA)' },
	{ id: 'tw2', label: 'Taïwan (TW)' },
	{ id: 'vn2', label: 'Viêt Nam (VN)' }
];

export const DEFAULT_PLATFORM: Platform = 'euw1';

export function isPlatform(value: string): value is Platform {
	return PLATFORMS.some((p) => p.id === value);
}

/** « EUW1_7212345678 » → « euw1 » : serveur d'origine d'un match (lien « Voir le profil », US3). */
export function platformFromMatchId(matchId: string): Platform | null {
	const separator = matchId.indexOf('_');
	if (separator <= 0) return null;
	const candidate = matchId.slice(0, separator).toLowerCase();
	return isPlatform(candidate) ? candidate : null;
}
