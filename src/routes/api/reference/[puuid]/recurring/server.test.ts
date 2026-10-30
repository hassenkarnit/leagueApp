import { describe, expect, it, vi } from 'vitest';
import { FRIEND, REF, sampleAnalysis } from '../../../../../../tests/fixtures/app/analysis.ts';
import { requestEvent } from '../../../../../../tests/helpers/request-event.ts';
import { analysisStore } from '#lib/server/services.ts';
import { GET } from './+server.ts';

vi.mock('#lib/server/services.ts', async () => {
	const { createTestServices } = await import('../../../../../../tests/helpers/services.ts');
	return createTestServices();
});

async function recurring(puuid: string) {
	const url = `http://localhost/api/reference/${puuid}/recurring`;
	const response = await GET(requestEvent<Parameters<typeof GET>[0]>({ puuid }, url));
	return { status: response.status, body: await response.json() };
}

describe('GET reference/{puuid}/recurring', () => {
	it('404 REFERENCE_NOT_ANALYZED sans analyse', async () => {
		const { status, body } = await recurring('puuid-sans-analyse');
		expect(status).toBe(404);
		expect(body.error.code).toBe('REFERENCE_NOT_ANALYZED');
	});

	it('→ { players } des joueurs croisés au moins 2 fois', async () => {
		await analysisStore.save(sampleAnalysis());
		const { status, body } = await recurring(REF);
		expect(status).toBe(200);
		expect(body.players.map((p: { puuid: string }) => p.puuid)).toEqual([FRIEND, 'puuid-x']);
	});
});
