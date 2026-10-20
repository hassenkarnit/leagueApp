import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { requestEvent } from '../../../../../../../tests/helpers/request-event.ts';
import { RIOT_PATHS, riotError } from '../../../../../../../tests/msw/handlers.ts';
import { server } from '../../../../../../../tests/msw/server.ts';
import { GET } from './+server.ts';

vi.mock('#lib/server/config.ts', () => ({ getRiotApiKey: () => 'RGAPI-test' }));

type Event = Parameters<typeof GET>[0];

async function get(riotId: string, query = '') {
	const url = `http://localhost/api/players/euw1/${riotId}/matches${query}`;
	const response = await GET(requestEvent<Event>({ platform: 'euw1', riotId }, url));
	return { response, body: await response.json() };
}

describe('GET /api/players/{platform}/{riotId}/matches', () => {
	it('200 : { matches, hasMore, skipped } avec start=0 et count=20 par défaut', async () => {
		const { response, body } = await get('Moi-EUW');
		expect(response.status).toBe(200);
		expect(body.matches).toHaveLength(4);
		expect(body.hasMore).toBe(false);
		expect(body.skipped).toBe(0);
	});

	it('respecte start et count', async () => {
		const { body } = await get('Moi-EUW', '?start=1&count=2');
		expect(body.matches.map((m: { matchId: string }) => m.matchId)).toEqual([
			'EUW1_1002',
			'EUW1_1003'
		]);
		expect(body.hasMore).toBe(true);
	});

	it.each(['?start=-1', '?count=0', '?count=21', '?start=abc', '?count=2.5'])(
		'400 INVALID_REQUEST pour %s',
		async (query) => {
			const { response, body } = await get('Moi-EUW', query);
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('INVALID_REQUEST');
		}
	);

	it('429 RIOT_RATE_LIMITED avec l’en-tête Retry-After', async () => {
		server.use(http.get(RIOT_PATHS.matchIds, () => riotError(429, { retryAfter: 1 })));
		const { response, body } = await get('Moi-EUW', '?start=40');
		expect(response.status).toBe(429);
		expect(response.headers.get('Retry-After')).toBe('1');
		expect(body.error.code).toBe('RIOT_RATE_LIMITED');
	});
});
