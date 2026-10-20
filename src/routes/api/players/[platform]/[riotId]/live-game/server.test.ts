import { describe, expect, it, vi } from 'vitest';
import { requestEvent } from '../../../../../../../tests/helpers/request-event.ts';
import { GET } from './+server.ts';

vi.mock('#lib/server/services.ts', async () => {
	const { createTestServices } = await import('../../../../../../../tests/helpers/services.ts');
	return createTestServices();
});

type Event = Parameters<typeof GET>[0];

async function get(platform: string, riotId: string) {
	const response = await GET(requestEvent<Event>({ platform, riotId }));
	return { status: response.status, body: await response.json() };
}

describe('GET /api/players/{platform}/{riotId}/live-game', () => {
	it('200 « in-game » pour un joueur en partie classée', async () => {
		const { status, body } = await get('euw1', 'Moi-EUW');
		expect(status).toBe(200);
		expect(body.state).toBe('in-game');
		expect(body.game.teams).toHaveLength(2);
	});

	it('200 « not-in-game » pour un joueur hors partie (ce n’est pas une erreur)', async () => {
		const { status, body } = await get('euw1', 'Ami-EUW1');
		expect(status).toBe(200);
		expect(body).toEqual({ state: 'not-in-game' });
	});

	it('400 INVALID_RIOT_ID', async () => {
		const { status, body } = await get('euw1', 'abc');
		expect(status).toBe(400);
		expect(body.error.code).toBe('INVALID_RIOT_ID');
	});

	it('400 INVALID_PLATFORM', async () => {
		const { status, body } = await get('ph2', 'Moi-EUW');
		expect(status).toBe(400);
		expect(body.error.code).toBe('INVALID_PLATFORM');
	});

	it('404 PLAYER_NOT_FOUND si le Riot ID n’existe pas', async () => {
		const { status, body } = await get('euw1', 'zzzzqq-0000');
		expect(status).toBe(404);
		expect(body.error.code).toBe('PLAYER_NOT_FOUND');
	});
});
