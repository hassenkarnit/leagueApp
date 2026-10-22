import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import activeGameAram from '../../../tests/fixtures/riot/active-game-aram.json';
import activeGameLoading from '../../../tests/fixtures/riot/active-game-loading.json';
import activeGameRanked from '../../../tests/fixtures/riot/active-game-ranked.json';
import { RIOT_PATHS, recordedRiotRequests } from '../../../tests/msw/handlers.ts';
import { server } from '../../../tests/msw/server.ts';
import { createLiveGameService } from './live-game.ts';
import { createRiotClient } from './riot/client.ts';
import { createLimiterRegistry } from './riot/rate-limiter.ts';
import { createStaticData } from './static-data.ts';

function setup() {
	let time = 0;
	const clock = {
		now: () => time,
		sleep: async (ms: number) => {
			time += ms;
		}
	};
	const riot = createRiotClient({
		apiKey: () => 'RGAPI-test',
		limiterFor: createLimiterRegistry(clock),
		logger: { warn: vi.fn() }
	});
	const liveGame = createLiveGameService({ riot, staticData: createStaticData(), now: clock.now });
	return { liveGame, riot, advance: (ms: number) => (time += ms) };
}

const spectatorRequests = () => recordedRiotRequests.filter((r) => r.url.includes('/spectator/'));

describe('getLiveGame', () => {
	it('partie classée Solo/Duo → « in-game » avec les deux équipes de 5', async () => {
		const { liveGame } = setup();
		const result = await liveGame.getLiveGame('euw1', 'puuid-reference');
		expect(result.state).toBe('in-game');
		if (result.state !== 'in-game') return;
		expect(result.game).toMatchObject({
			gameId: 7300000001,
			queueLabel: 'Classée Solo/Duo',
			startedAt: new Date(1792500000000).toISOString()
		});
		expect(result.game.teams.map((t) => t.side)).toEqual(['blue', 'red']);
		expect(result.game.teams.map((t) => t.participants.length)).toEqual([5, 5]);
		expect(result.game.teams[0].participants[0]).toEqual({
			puuid: 'puuid-reference',
			isHidden: false,
			gameName: 'Moi',
			tagLine: 'EUW',
			championName: 'Ahri',
			championIconUrl: 'https://ddragon.leagueoflegends.com/cdn/16.20.1/img/champion/Ahri.png',
			side: 'blue'
		});
	});

	it('découpe un Riot ID contenant des espaces et gère un champion inconnu', async () => {
		const { liveGame } = setup();
		const result = await liveGame.getLiveGame('euw1', 'puuid-reference');
		if (result.state !== 'in-game') throw new Error('in-game attendu');
		expect(result.game.teams[1].participants[4]).toMatchObject({
			gameName: 'Le Nouveau',
			tagLine: 'EUW',
			championName: 'Champion 9999',
			championIconUrl: null
		});
	});

	it('autre mode → « in-game » aussi, avec le libellé du mode', async () => {
		server.use(http.get(RIOT_PATHS.activeGame, () => Response.json(activeGameAram)));
		const { liveGame } = setup();
		const result = await liveGame.getLiveGame('euw1', 'puuid-reference');
		if (result.state !== 'in-game') throw new Error('in-game attendu');
		expect(result.game.queueLabel).toBe('ARAM');
	});

	it('hors partie → « not-in-game »', async () => {
		const { liveGame } = setup();
		expect(await liveGame.getLiveGame('euw1', 'puuid-hors-partie')).toEqual({
			state: 'not-in-game'
		});
	});

	it('écran de chargement → startedAt null', async () => {
		server.use(http.get(RIOT_PATHS.activeGame, () => Response.json(activeGameLoading)));
		const { liveGame } = setup();
		const result = await liveGame.getLiveGame('euw1', 'puuid-reference');
		expect(result.state === 'in-game' && result.game.startedAt).toBeNull();
	});

	it('accepte un joueur masqué par Riot (puuid null, riotId = nom du champion) — FR-006a', async () => {
		const withHidden = structuredClone(activeGameRanked);
		Object.assign(withHidden.participants[9], { puuid: null, riotId: 'Vayne', championId: 67 });
		server.use(http.get(RIOT_PATHS.activeGame, () => Response.json(withHidden)));
		const { liveGame } = setup();
		const result = await liveGame.getLiveGame('euw1', 'puuid-reference');
		if (result.state !== 'in-game') throw new Error('in-game attendu');
		expect(result.game.teams[1].participants[4]).toEqual({
			puuid: null,
			isHidden: true,
			gameName: '',
			tagLine: '',
			championName: 'Vayne',
			championIconUrl: 'https://ddragon.leagueoflegends.com/cdn/16.20.1/img/champion/Vayne.png',
			side: 'red'
		});
		expect(result.game.teams[0].participants[0].isHidden).toBe(false);
	});

	it('ne met jamais la partie en cours en cache (FR-001)', async () => {
		const { liveGame } = setup();
		await liveGame.getLiveGame('euw1', 'puuid-reference');
		await liveGame.getLiveGame('euw1', 'puuid-reference');
		expect(spectatorRequests()).toHaveLength(2);
	});

	it('interroge Riot en priorité « interactive »', async () => {
		const { liveGame, riot } = setup();
		const getActiveGame = vi.spyOn(riot, 'getActiveGame');
		await liveGame.getLiveGame('euw1', 'puuid-reference');
		expect(getActiveGame).toHaveBeenCalledWith('puuid-reference', 'euw1', 'interactive');
	});
});

const leagueRequests = () => recordedRiotRequests.filter((r) => r.url.includes('/league/'));

describe('getRankedStats (US3)', () => {
	it('classé en Solo/Duo → rang, palier en français et % de victoires', async () => {
		const { liveGame } = setup();
		const stats = await liveGame.getRankedStats('euw1', ['puuid-reference']);
		expect(stats['puuid-reference']).toEqual({
			status: 'ranked',
			tier: 'PLATINUM',
			tierLabel: 'Platine',
			division: 'II',
			leaguePoints: 45,
			wins: 120,
			losses: 102,
			winRate: 54
		});
	});

	it('classé seulement en Flex, ou sans aucune entrée → « unranked »', async () => {
		const { liveGame } = setup();
		const stats = await liveGame.getRankedStats('euw1', ['puuid-friend', 'puuid-jamais-classe']);
		expect(stats).toEqual({
			'puuid-friend': { status: 'unranked' },
			'puuid-jamais-classe': { status: 'unranked' }
		});
	});

	it('masque la division pour Challenger', async () => {
		server.use(
			http.get(RIOT_PATHS.leagueEntries, () =>
				Response.json([
					{
						queueType: 'RANKED_SOLO_5x5',
						tier: 'CHALLENGER',
						rank: 'I',
						leaguePoints: 2256,
						wins: 448,
						losses: 371
					}
				])
			)
		);
		const { liveGame } = setup();
		const stats = await liveGame.getRankedStats('kr', ['puuid-faker']);
		expect(stats['puuid-faker']).toMatchObject({
			tierLabel: 'Challenger',
			division: null,
			winRate: 55
		});
	});

	it('un joueur en erreur → « unavailable » sans bloquer les autres', async () => {
		server.use(
			http.get(RIOT_PATHS.leagueEntries, ({ params }) =>
				params.puuid === 'puuid-en-erreur' ? Response.json({}, { status: 503 }) : undefined
			)
		);
		const { liveGame } = setup();
		const stats = await liveGame.getRankedStats('euw1', ['puuid-reference', 'puuid-en-erreur']);
		expect(stats['puuid-reference'].status).toBe('ranked');
		expect(stats['puuid-en-erreur']).toEqual({ status: 'unavailable' });
	});

	it('met les statistiques en cache 10 min (FR-016)', async () => {
		const { liveGame, advance } = setup();
		await liveGame.getRankedStats('euw1', ['puuid-reference', 'puuid-friend']);
		expect(leagueRequests()).toHaveLength(2);
		advance(10 * 60 * 1000 - 1);
		await liveGame.getRankedStats('euw1', ['puuid-reference', 'puuid-friend']);
		expect(leagueRequests()).toHaveLength(2);
		advance(1);
		await liveGame.getRankedStats('euw1', ['puuid-reference']);
		expect(leagueRequests()).toHaveLength(3);
	});

	it('ne met jamais en cache un « unavailable »', async () => {
		let calls = 0;
		server.use(
			http.get(RIOT_PATHS.leagueEntries, () => {
				calls += 1;
				return calls === 1 ? Response.json({}, { status: 503 }) : Response.json([]);
			})
		);
		const { liveGame } = setup();
		expect((await liveGame.getRankedStats('euw1', ['puuid-x']))['puuid-x'].status).toBe(
			'unavailable'
		);
		expect((await liveGame.getRankedStats('euw1', ['puuid-x']))['puuid-x'].status).toBe('unranked');
	});
});
