import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RIOT_PATHS, recordedRiotRequests, riotError } from '../../../../tests/msw/handlers.ts';
import { server } from '../../../../tests/msw/server.ts';
import { AppError } from '../errors.ts';
import { MatchUnavailableError, createRiotClient } from './client.ts';
import { createLimiterRegistry } from './rate-limiter.ts';

const FAKE_KEY = 'RGAPI-test';

function setup() {
	let time = 0;
	const clock = {
		now: () => time,
		sleep: async (ms: number) => {
			time += ms;
		}
	};
	const logger = { warn: vi.fn() };
	const client = createRiotClient({
		apiKey: () => FAKE_KEY,
		limiterFor: createLimiterRegistry(clock),
		logger
	});
	return { client, logger, elapsed: () => time };
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
	} catch (err) {
		return err;
	}
	throw new Error('une erreur était attendue');
}

afterEach(() => vi.restoreAllMocks());

describe('client Riot : requêtes', () => {
	it('envoie la clé dans l’en-tête X-Riot-Token, jamais dans l’URL', async () => {
		const { client } = setup();
		await client.getAccountByRiotId({ gameName: 'Moi', tagLine: 'EUW' }, 'euw1');
		const request = recordedRiotRequests[0];
		expect(request.headers.get('X-Riot-Token')).toBe(FAKE_KEY);
		expect(request.url).not.toContain(FAKE_KEY);
	});

	it('appelle le bon hôte régional (account sur asia pour oc1, match sur sea)', async () => {
		const { client } = setup();
		await client.getAccountByRiotId({ gameName: 'Moi', tagLine: 'EUW' }, 'oc1');
		await client.getMatchIds('puuid-reference', 'oc1', { start: 0, count: 20 });
		expect(new URL(recordedRiotRequests[0].url).host).toBe('asia.api.riotgames.com');
		expect(new URL(recordedRiotRequests[1].url).host).toBe('sea.api.riotgames.com');
	});

	it('encode le Riot ID dans le chemin', async () => {
		const { client } = setup();
		await captureError(
			client.getAccountByRiotId({ gameName: 'Le Joueur', tagLine: 'EUW' }, 'euw1')
		);
		expect(recordedRiotRequests[0].url).toContain('/by-riot-id/Le%20Joueur/EUW');
	});

	it('transmet start et count pour la liste des matchs', async () => {
		const { client } = setup();
		const ids = await client.getMatchIds('puuid-reference', 'euw1', { start: 1, count: 2 });
		expect(ids).toEqual(['EUW1_1002', 'EUW1_1003']);
		const url = new URL(recordedRiotRequests[0].url);
		expect(url.searchParams.get('start')).toBe('1');
		expect(url.searchParams.get('count')).toBe('2');
	});

	it('valide et renvoie le détail d’un match', async () => {
		const { client } = setup();
		const match = await client.getMatch('EUW1_1001', 'euw1');
		expect(match.metadata.matchId).toBe('EUW1_1001');
		expect(match.info.participants).toHaveLength(10);
	});
});

describe('client Riot : erreurs', () => {
	it('404 sur un compte → PLAYER_NOT_FOUND', async () => {
		const { client } = setup();
		const err = await captureError(
			client.getAccountByRiotId({ gameName: 'zzzzqq', tagLine: '0000' }, 'euw1')
		);
		expect(err).toBeInstanceOf(AppError);
		expect((err as AppError).code).toBe('PLAYER_NOT_FOUND');
	});

	it.each([401, 403])(
		'%i → RIOT_API_KEY_INVALID + un seul avertissement serveur, sans la clé',
		async (status) => {
			server.use(http.get(RIOT_PATHS.accountByRiotId, () => riotError(status)));
			const { client, logger } = setup();
			const id = { gameName: 'Moi', tagLine: 'EUW' };
			const err = await captureError(client.getAccountByRiotId(id, 'euw1'));
			await captureError(client.getAccountByRiotId(id, 'euw1'));

			expect((err as AppError).code).toBe('RIOT_API_KEY_INVALID');
			expect((err as AppError).message).not.toContain(FAKE_KEY);
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(String(logger.warn.mock.calls[0][0])).toContain('Clé API invalide ou expirée');
			expect(String(logger.warn.mock.calls[0][0])).not.toContain(FAKE_KEY);
		}
	);

	it.each([403, 404])(
		'%i sur un détail de match → match indisponible, pas de clé invalide',
		async (status) => {
			server.use(http.get(RIOT_PATHS.match, () => riotError(status)));
			const { client, logger } = setup();
			const err = await captureError(client.getMatch('EUW1_9999', 'euw1'));
			expect(err).toBeInstanceOf(MatchUnavailableError);
			expect(logger.warn).not.toHaveBeenCalled();
		}
	);

	it('429 avec Retry-After : pause de l’hôte puis un nouvel essai réussi', async () => {
		let calls = 0;
		server.use(
			http.get(RIOT_PATHS.matchIds, () => {
				calls += 1;
				return calls === 1 ? riotError(429, { retryAfter: 2 }) : undefined;
			})
		);
		const { client, elapsed } = setup();
		const ids = await client.getMatchIds('puuid-reference', 'euw1', { start: 0, count: 20 });
		expect(ids).toHaveLength(4);
		expect(elapsed()).toBeGreaterThanOrEqual(2000);
	});

	it('429 sans Retry-After : pause de 1 s puis un nouvel essai', async () => {
		let calls = 0;
		server.use(
			http.get(RIOT_PATHS.matchIds, () => {
				calls += 1;
				return calls === 1 ? riotError(429) : undefined;
			})
		);
		const { client, elapsed } = setup();
		await client.getMatchIds('puuid-reference', 'euw1', { start: 0, count: 20 });
		expect(elapsed()).toBeGreaterThanOrEqual(1000);
	});

	it('429 deux fois de suite → RIOT_RATE_LIMITED avec le délai', async () => {
		server.use(http.get(RIOT_PATHS.matchIds, () => riotError(429, { retryAfter: 5 })));
		const { client } = setup();
		const err = await captureError(
			client.getMatchIds('puuid-reference', 'euw1', { start: 0, count: 20 })
		);
		expect((err as AppError).code).toBe('RIOT_RATE_LIMITED');
		expect((err as AppError).retryAfterSeconds).toBe(5);
	});

	it('5xx → RIOT_UNAVAILABLE', async () => {
		server.use(http.get(RIOT_PATHS.summonerByPuuid, () => riotError(503)));
		const { client } = setup();
		const err = await captureError(client.getSummonerByPuuid('puuid-reference', 'euw1'));
		expect((err as AppError).code).toBe('RIOT_UNAVAILABLE');
	});

	it('réponse au mauvais format → RIOT_UNAVAILABLE', async () => {
		server.use(http.get(RIOT_PATHS.summonerByPuuid, () => Response.json({ inattendu: true })));
		const { client } = setup();
		const err = await captureError(client.getSummonerByPuuid('puuid-reference', 'euw1'));
		expect((err as AppError).code).toBe('RIOT_UNAVAILABLE');
	});

	it('panne réseau → RIOT_UNAVAILABLE', async () => {
		server.use(http.get(RIOT_PATHS.summonerByPuuid, () => Response.error()));
		const { client } = setup();
		const err = await captureError(client.getSummonerByPuuid('puuid-reference', 'euw1'));
		expect((err as AppError).code).toBe('RIOT_UNAVAILABLE');
	});
});

describe('client Riot : partie en cours et classement (feature 002)', () => {
	it('getActiveGame renvoie la partie, sur l’hôte plateforme', async () => {
		const { client } = setup();
		const game = await client.getActiveGame('puuid-reference', 'euw1');
		expect(game?.gameQueueConfigId).toBe(420);
		expect(game?.participants).toHaveLength(10);
		expect(new URL(recordedRiotRequests[0].url).host).toBe('euw1.api.riotgames.com');
	});

	it('getActiveGame renvoie null hors partie (404 n’est pas une erreur)', async () => {
		const { client, logger } = setup();
		expect(await client.getActiveGame('puuid-hors-partie', 'euw1')).toBeNull();
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('getActiveGame : 401 → RIOT_API_KEY_INVALID', async () => {
		server.use(http.get(RIOT_PATHS.activeGame, () => riotError(401)));
		const { client } = setup();
		const err = await captureError(client.getActiveGame('puuid-reference', 'euw1'));
		expect((err as AppError).code).toBe('RIOT_API_KEY_INVALID');
	});

	it('getLeagueEntries renvoie les entrées classées, sur l’hôte plateforme', async () => {
		const { client } = setup();
		const entries = await client.getLeagueEntries('puuid-reference', 'kr');
		expect(entries.map((e) => e.queueType)).toEqual(['RANKED_SOLO_5x5', 'RANKED_FLEX_SR']);
		expect(new URL(recordedRiotRequests[0].url).host).toBe('kr.api.riotgames.com');
	});
});
