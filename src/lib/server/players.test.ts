import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { RIOT_PATHS, recordedRiotRequests, riotError } from '../../../tests/msw/handlers.ts';
import { server } from '../../../tests/msw/server.ts';
import { AppError } from './errors.ts';
import { createPlayersService } from './players.ts';
import { createRiotClient } from './riot/client.ts';
import { createLimiterRegistry } from './riot/rate-limiter.ts';
import { createStaticData } from './static-data.ts';

const ME = { gameName: 'Moi', tagLine: 'EUW' };

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
	const players = createPlayersService({ riot, staticData: createStaticData(), now: clock.now });
	return { players, riot };
}

describe('getProfile', () => {
	it('renvoie le profil du joueur', async () => {
		const { players } = setup();
		expect(await players.getProfile('euw1', ME)).toEqual({
			puuid: 'puuid-reference',
			gameName: 'Moi',
			tagLine: 'EUW',
			platform: 'euw1',
			profileIconUrl: 'https://ddragon.leagueoflegends.com/cdn/16.20.1/img/profileicon/4568.png',
			summonerLevel: 312
		});
	});

	it('sert un 2e appel depuis le cache, sans requête Riot (SC-002)', async () => {
		const { players } = setup();
		await players.getProfile('euw1', ME);
		const before = recordedRiotRequests.length;
		await players.getProfile('euw1', { gameName: 'moi', tagLine: 'euw' });
		expect(recordedRiotRequests.length).toBe(before);
	});

	it('signale un joueur introuvable', async () => {
		const { players } = setup();
		await expect(
			players.getProfile('euw1', { gameName: 'zzzzqq', tagLine: '0000' })
		).rejects.toMatchObject({ code: 'PLAYER_NOT_FOUND' });
	});

	it('refuse un serveur inconnu', async () => {
		const { players } = setup();
		await expect(players.getProfile('ph2', ME)).rejects.toBeInstanceOf(AppError);
	});
});

describe('getMatchPage', () => {
	it('renvoie les matchs du plus récent au plus ancien', async () => {
		const { players } = setup();
		const page = await players.getMatchPage('euw1', ME, 0, 20);
		expect(page.matches.map((m) => m.matchId)).toEqual([
			'EUW1_1001',
			'EUW1_1002',
			'EUW1_1003',
			'EUW1_1004'
		]);
		expect(page.hasMore).toBe(false);
		expect(page.skipped).toBe(0);
	});

	it('résume un match du point de vue du joueur consulté', async () => {
		const { players } = setup();
		const [win, loss] = (await players.getMatchPage('euw1', ME, 0, 20)).matches;

		expect(win).toMatchObject({
			queueLabel: 'Classée Solo/Duo',
			playedAt: new Date(1792500000000).toISOString(),
			durationSeconds: 1820,
			outcome: 'win',
			player: {
				puuid: 'puuid-reference',
				gameName: 'Moi',
				tagLine: 'EUW',
				isBot: false,
				championName: 'Ahri',
				championIconUrl: 'https://ddragon.leagueoflegends.com/cdn/16.20.1/img/champion/Ahri.png',
				side: 'blue',
				kills: 3,
				deaths: 2,
				assists: 5
			}
		});
		expect(loss.outcome).toBe('loss');
	});

	it('répartit les 10 participants en deux équipes de 5 (bleue puis rouge)', async () => {
		const { players } = setup();
		const [match] = (await players.getMatchPage('euw1', ME, 0, 20)).matches;
		expect(match.teams.map((t) => t.side)).toEqual(['blue', 'red']);
		expect(match.teams.map((t) => t.participants.length)).toEqual([5, 5]);
		expect(match.teams.map((t) => t.outcome)).toEqual(['win', 'loss']);
		expect(match.teams[0].participants.every((p) => p.side === 'blue')).toBe(true);
	});

	it('marque une partie écourtée comme « remake » pour les deux équipes', async () => {
		const { players } = setup();
		const remake = (await players.getMatchPage('euw1', ME, 0, 20)).matches[2];
		expect(remake.outcome).toBe('remake');
		expect(remake.teams.map((t) => t.outcome)).toEqual(['remake', 'remake']);
	});

	it('gère les bots et une durée exprimée en millisecondes', async () => {
		const { players } = setup();
		const coop = (await players.getMatchPage('euw1', ME, 0, 20)).matches[3];
		expect(coop.durationSeconds).toBe(1500);
		expect(coop.queueLabel).toBe('Co-op vs. AI Intermediate Bot games');
		expect(coop.teams[1].participants).toHaveLength(5);
		for (const bot of coop.teams[1].participants) {
			expect(bot).toMatchObject({ isBot: true, puuid: null, gameName: null, tagLine: null });
		}
	});

	it('omet un match refusé par Riot et le compte dans « skipped »', async () => {
		server.use(
			http.get(RIOT_PATHS.match, ({ params }) =>
				params.matchId === 'EUW1_1002' ? riotError(403) : undefined
			)
		);
		const { players } = setup();
		const page = await players.getMatchPage('euw1', ME, 0, 20);
		expect(page.matches).toHaveLength(3);
		expect(page.skipped).toBe(1);
	});

	it('indique qu’une page suivante existe quand Riot renvoie « count » IDs', async () => {
		const { players } = setup();
		const page = await players.getMatchPage('euw1', ME, 0, 2);
		expect(page.matches).toHaveLength(2);
		expect(page.hasMore).toBe(true);
	});

	it('met la liste des IDs en cache 5 min et le détail des matchs sans limite', async () => {
		const { players } = setup();
		await players.getMatchPage('euw1', ME, 0, 20);
		const before = recordedRiotRequests.length;
		await players.getMatchPage('euw1', ME, 0, 20);
		expect(recordedRiotRequests.length).toBe(before);
	});

	it('passe tous les appels Riot en priorité « interactive »', async () => {
		const { players, riot } = setup();
		const getMatch = vi.spyOn(riot, 'getMatch');
		await players.getMatchPage('euw1', ME, 0, 20);
		expect(getMatch).toHaveBeenCalled();
		for (const call of getMatch.mock.calls) expect(call[2]).toBe('interactive');
	});
});
