import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { requestEvent } from '../../../../../../tests/helpers/request-event.ts';
import { RIOT_PATHS, riotError } from '../../../../../../tests/msw/handlers.ts';
import { server } from '../../../../../../tests/msw/server.ts';
import { GET } from './+server.ts';

// Jamais la vraie clé de .env dans les tests (principe I).
vi.mock('#lib/server/config.ts', () => ({ getRiotApiKey: () => 'RGAPI-test' }));

type Event = Parameters<typeof GET>[0];

async function get(platform: string, riotId: string) {
	const response = await GET(requestEvent<Event>({ platform, riotId }));
	return { status: response.status, body: await response.json() };
}

describe('GET /api/players/{platform}/{riotId}', () => {
	it('200 : renvoie le profil conforme au contrat', async () => {
		const { status, body } = await get('euw1', 'Moi-EUW');
		expect(status).toBe(200);
		expect(body).toEqual({
			puuid: 'puuid-reference',
			gameName: 'Moi',
			tagLine: 'EUW',
			platform: 'euw1',
			profileIconUrl: expect.stringContaining('/img/profileicon/4568.png'),
			summonerLevel: 312
		});
	});

	it.each(['abc', 'Moi-ABCDEF'])('400 INVALID_RIOT_ID pour « %s »', async (riotId) => {
		const { status, body } = await get('euw1', riotId);
		expect(status).toBe(400);
		expect(body.error.code).toBe('INVALID_RIOT_ID');
	});

	it('400 INVALID_PLATFORM pour un serveur inconnu', async () => {
		const { status, body } = await get('ph2', 'Moi-EUW');
		expect(status).toBe(400);
		expect(body.error.code).toBe('INVALID_PLATFORM');
	});

	it('404 PLAYER_NOT_FOUND', async () => {
		const { status, body } = await get('euw1', 'zzzzqq-0000');
		expect(status).toBe(404);
		expect(body.error.code).toBe('PLAYER_NOT_FOUND');
	});

	it('503 RIOT_API_KEY_INVALID quand Riot répond 401', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		server.use(http.get(RIOT_PATHS.accountByRiotId, () => riotError(401)));
		const { status, body } = await get('euw1', 'CleExpiree-EUW');
		expect(status).toBe(503);
		expect(body.error.code).toBe('RIOT_API_KEY_INVALID');
		expect(JSON.stringify(body)).not.toContain('RGAPI-test');
	});
});
