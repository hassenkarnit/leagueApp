import { describe, expect, it } from 'vitest';
import type { ReferenceAccount } from '../shared/types.ts';
import { REFERENCE_STORAGE_KEY, ReferenceStore } from './reference.svelte.ts';

const ME: ReferenceAccount = {
	puuid: 'puuid-reference',
	gameName: 'Moi',
	tagLine: 'EUW',
	platform: 'euw1'
};

function memoryStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => void data.set(key, value),
		removeItem: (key: string) => void data.delete(key),
		data
	};
}

const brokenStorage = {
	getItem: () => {
		throw new Error('SecurityError');
	},
	setItem: () => {
		throw new Error('QuotaExceededError');
	},
	removeItem: () => {
		throw new Error('SecurityError');
	}
};

describe('ReferenceStore', () => {
	it('persiste le compte de référence sous « leagueapp.reference »', () => {
		const storage = memoryStorage();
		const store = new ReferenceStore(storage);
		store.set(ME);
		expect(store.current).toEqual(ME);
		expect(JSON.parse(storage.data.get(REFERENCE_STORAGE_KEY)!)).toEqual(ME);
	});

	it('relit le compte au chargement (FR-009)', () => {
		const storage = memoryStorage({ [REFERENCE_STORAGE_KEY]: JSON.stringify(ME) });
		expect(new ReferenceStore(storage).current).toEqual(ME);
	});

	it('efface le compte', () => {
		const storage = memoryStorage();
		const store = new ReferenceStore(storage);
		store.set(ME);
		store.clear();
		expect(store.current).toBeNull();
		expect(storage.data.has(REFERENCE_STORAGE_KEY)).toBe(false);
	});

	it('ignore une valeur stockée invalide', () => {
		const storage = memoryStorage({ [REFERENCE_STORAGE_KEY]: '{"puuid": 42}' });
		expect(new ReferenceStore(storage).current).toBeNull();
	});

	it('ne lève jamais d’exception si le stockage est indisponible (navigation privée)', () => {
		const store = new ReferenceStore(brokenStorage);
		expect(store.current).toBeNull();
		expect(() => store.set(ME)).not.toThrow();
		expect(store.current).toEqual(ME);
		expect(() => store.clear()).not.toThrow();
	});
});
