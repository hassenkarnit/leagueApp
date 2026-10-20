// Compte de référence (« moi »), mémorisé uniquement dans le navigateur (FR-009, research.md R12).
import { isPlatform } from '#lib/shared/platforms.ts';
import type { ReferenceAccount } from '#lib/shared/types.ts';

export const REFERENCE_STORAGE_KEY = 'leagueapp.reference';

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isReferenceAccount(value: unknown): value is ReferenceAccount {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.puuid === 'string' &&
		typeof v.gameName === 'string' &&
		typeof v.tagLine === 'string' &&
		typeof v.platform === 'string' &&
		isPlatform(v.platform)
	);
}

/** Le stockage peut être absent (rendu serveur) ou interdit (navigation privée) : jamais d'exception. */
export class ReferenceStore {
	readonly #storage: KeyValueStorage | null;
	current = $state<ReferenceAccount | null>(null);

	constructor(storage: KeyValueStorage | null) {
		this.#storage = storage;
		try {
			const saved = JSON.parse(storage?.getItem(REFERENCE_STORAGE_KEY) ?? 'null');
			this.current = isReferenceAccount(saved) ? saved : null;
		} catch {
			this.current = null;
		}
	}

	set(reference: ReferenceAccount): void {
		this.current = reference;
		try {
			this.#storage?.setItem(REFERENCE_STORAGE_KEY, JSON.stringify(reference));
		} catch {
			// Stockage indisponible : le compte reste défini pour cette visite seulement.
		}
	}

	clear(): void {
		this.current = null;
		try {
			this.#storage?.removeItem(REFERENCE_STORAGE_KEY);
		} catch {
			// idem
		}
	}
}

function browserStorage(): KeyValueStorage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null;
	}
}

export const reference = new ReferenceStore(browserStorage());
