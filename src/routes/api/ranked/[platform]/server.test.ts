import { describe, expect, it, vi } from 'vitest';
import { requestEvent } from '../../../../../tests/helpers/request-event.ts';
import { GET } from './+server.ts';

vi.mock('#lib/server/services.ts', async () => {
	const { createTestServices } = await import('../../../../../tests/helpers/services.ts');
	return createTestServices();
});

type Event = Parameters<typeof GET>[0];

async function get(platform: string, query: string) {
	const url = `http://localhost/api/ranked/${platform}${query}`;
	const response = await GET(requestEvent<Event>({ platform }, url));
	return { status: response.status, body: await response.json() };
}

describe('GET /api/ranked/{platform}', () => {
	it('200 { stats } avec une entrée par PUUID demandé', async () => {
		const { status, body } = await get('euw1', '?puuids=puuid-reference,puuid-friend');
		expect(status).toBe(200);
		expect(body.stats['puuid-reference']).toMatchObject({ status: 'ranked', winRate: 54 });
		expect(body.stats['puuid-friend']).toEqual({ status: 'unranked' });
	});

	it.each(['', '?puuids=', `?puuids=${Array.from({ length: 11 }, (_, i) => `p${i}`).join(',')}`])(
		'400 INVALID_REQUEST pour « %s » (1 à 10 PUUID)',
		async (query) => {
			const { status, body } = await get('euw1', query);
			expect(status).toBe(400);
			expect(body.error.code).toBe('INVALID_REQUEST');
		}
	);

	it('400 INVALID_PLATFORM', async () => {
		const { status, body } = await get('ph2', '?puuids=puuid-reference');
		expect(status).toBe(400);
		expect(body.error.code).toBe('INVALID_PLATFORM');
	});
});
