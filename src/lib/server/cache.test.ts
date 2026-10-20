import { describe, expect, it, vi } from 'vitest';
import { TtlCache } from './cache.ts';

function createClock(start = 0) {
	let time = start;
	return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe('TtlCache', () => {
	it('renvoie la valeur avant expiration et plus rien après le TTL', () => {
		const clock = createClock();
		const cache = new TtlCache<string, number>({ ttlMs: 1000, now: clock.now });
		cache.set('a', 1);
		clock.advance(999);
		expect(cache.get('a')).toBe(1);
		clock.advance(1);
		expect(cache.get('a')).toBeUndefined();
	});

	it('évince l’entrée la plus ancienne au-delà de maxEntries', () => {
		const cache = new TtlCache<string, number>({ ttlMs: Infinity, maxEntries: 2 });
		cache.set('a', 1);
		cache.set('b', 2);
		cache.set('c', 3);
		expect(cache.get('a')).toBeUndefined();
		expect(cache.get('b')).toBe(2);
		expect(cache.get('c')).toBe(3);
	});

	it('getOrLoad n’appelle le chargeur qu’une fois pour deux appels simultanés', async () => {
		const cache = new TtlCache<string, number>({ ttlMs: 1000 });
		const loader = vi.fn(async () => 42);
		const [first, second] = await Promise.all([
			cache.getOrLoad('k', loader),
			cache.getOrLoad('k', loader)
		]);
		expect(first).toBe(42);
		expect(second).toBe(42);
		expect(loader).toHaveBeenCalledTimes(1);
	});

	it('getOrLoad ne met pas en cache un chargement qui échoue', async () => {
		const cache = new TtlCache<string, number>({ ttlMs: 1000 });
		await expect(cache.getOrLoad('k', () => Promise.reject(new Error('boom')))).rejects.toThrow(
			'boom'
		);
		await expect(cache.getOrLoad('k', async () => 7)).resolves.toBe(7);
	});
});
