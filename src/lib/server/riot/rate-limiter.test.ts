import { describe, expect, it } from 'vitest';
import { RateLimiter, createLimiterRegistry } from './rate-limiter.ts';

/** Horloge virtuelle : `sleep` avance le temps au lieu d'attendre réellement. */
function createVirtualTime() {
	let time = 0;
	return {
		now: () => time,
		sleep: async (ms: number) => {
			time += ms;
		}
	};
}

function createLimiter() {
	const clock = createVirtualTime();
	const limiter = new RateLimiter({ now: clock.now, sleep: clock.sleep });
	return { clock, limiter };
}

describe('RateLimiter', () => {
	it('respecte la fenêtre de 20 requêtes par seconde', async () => {
		const { clock, limiter } = createLimiter();
		const startTimes = await Promise.all(
			Array.from({ length: 21 }, () => limiter.schedule(async () => clock.now()))
		);
		expect(startTimes.slice(0, 20).every((t) => t === 0)).toBe(true);
		expect(startTimes[20]).toBeGreaterThanOrEqual(1000);
	});

	it('respecte la fenêtre de 100 requêtes par 2 minutes', async () => {
		const { clock, limiter } = createLimiter();
		const startTimes = await Promise.all(
			Array.from({ length: 101 }, () => limiter.schedule(async () => clock.now()))
		);
		expect(startTimes[99]).toBeLessThan(120_000);
		expect(startTimes[100]).toBeGreaterThanOrEqual(120_000);
	});

	it('se recale sur les limites et compteurs envoyés par Riot', async () => {
		const { clock, limiter } = createLimiter();
		limiter.updateFromHeaders(
			new Headers({ 'X-App-Rate-Limit': '2:1', 'X-App-Rate-Limit-Count': '2:1' }),
			'm'
		);
		// Riot dit que 2 requêtes sur 2 ont déjà été consommées dans la seconde.
		const start = await limiter.schedule(async () => clock.now());
		expect(start).toBeGreaterThanOrEqual(1000);
	});

	it('respecte aussi la limite propre à une méthode (X-Method-Rate-Limit)', async () => {
		const { clock, limiter } = createLimiter();
		limiter.updateFromHeaders(
			new Headers({ 'X-Method-Rate-Limit': '1:10', 'X-Method-Rate-Limit-Count': '1:10' }),
			'match.getMatch'
		);
		const otherMethod = await limiter.schedule(async () => clock.now(), {
			method: 'account.byRiotId'
		});
		expect(otherMethod).toBe(0);
		const sameMethod = await limiter.schedule(async () => clock.now(), {
			method: 'match.getMatch'
		});
		expect(sameMethod).toBeGreaterThanOrEqual(10_000);
	});

	it('ne lance rien pendant une pause Retry-After', async () => {
		const { clock, limiter } = createLimiter();
		limiter.pauseFor(3);
		const start = await limiter.schedule(async () => clock.now());
		expect(start).toBeGreaterThanOrEqual(3000);
	});

	it('fait passer une requête interactive avant les requêtes de fond en attente', async () => {
		const { clock, limiter } = createLimiter();
		const order: string[] = [];
		const background = Array.from({ length: 25 }, (_, i) =>
			limiter.schedule(
				async () => {
					order.push(`bg${i}`);
					return clock.now();
				},
				{ priority: 'background' }
			)
		);
		const interactive = limiter.schedule(
			async () => {
				order.push('interactive');
				return clock.now();
			},
			{ priority: 'interactive' }
		);
		await Promise.all([...background, interactive]);
		// Les 20 premières requêtes de fond partent tout de suite, la requête interactive juste après.
		expect(order.indexOf('interactive')).toBe(20);
	});

	it('propage l’erreur d’une tâche sans bloquer la file', async () => {
		const { limiter } = createLimiter();
		await expect(limiter.schedule(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
		await expect(limiter.schedule(async () => 'ok')).resolves.toBe('ok');
	});
});

describe('createLimiterRegistry', () => {
	it('crée un limiteur indépendant par hôte, réutilisé ensuite', () => {
		const limiterFor = createLimiterRegistry();
		const europe = limiterFor('europe.api.riotgames.com');
		expect(limiterFor('europe.api.riotgames.com')).toBe(europe);
		expect(limiterFor('euw1.api.riotgames.com')).not.toBe(europe);
	});
});
