import { describe, expect, it, vi } from 'vitest';
import { requestEvent } from '../../../../../../tests/helpers/request-event.ts';
import { analyzer } from '#lib/server/services.ts';
import { GET, POST } from './+server.ts';

vi.mock('#lib/server/services.ts', async () => {
	const { createTestServices } = await import('../../../../../../tests/helpers/services.ts');
	return createTestServices();
});

type GetEvent = Parameters<typeof GET>[0];
type PostEvent = Parameters<typeof POST>[0];
const REF = 'puuid-reference';
const URL_ = `http://localhost/api/reference/${REF}/analysis`;

async function getStatus() {
	const response = await GET(requestEvent<GetEvent>({ puuid: REF }, URL_));
	return { status: response.status, body: await response.json() };
}

async function start(body: unknown) {
	const response = await POST(
		requestEvent<PostEvent>({ puuid: REF }, URL_, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	);
	return { status: response.status, body: await response.json() };
}

describe('/api/reference/{puuid}/analysis', () => {
	it('GET : « never » avant toute analyse', async () => {
		const { status, body } = await getStatus();
		expect(status).toBe(200);
		expect(body.state).toBe('never');
	});

	it('POST : 400 INVALID_PLATFORM pour un serveur inconnu', async () => {
		const { status, body } = await start({ platform: 'ph2' });
		expect(status).toBe(400);
		expect(body.error.code).toBe('INVALID_PLATFORM');
	});

	it('POST : 400 INVALID_REQUEST si le corps est absent ou invalide', async () => {
		const { status, body } = await start('pas un objet');
		expect(status).toBe(400);
		expect(body.error.code).toBe('INVALID_REQUEST');
	});

	it('POST : 202 puis 409 pendant l’analyse, puis GET « done »', async () => {
		const first = await start({ platform: 'euw1' });
		expect(first.status).toBe(202);
		expect(first.body.state).toBe('running');

		const second = await start({ platform: 'euw1' });
		expect(second.status).toBe(409);
		expect(second.body.error.code).toBe('ANALYSIS_ALREADY_RUNNING');

		await analyzer.whenIdle(REF);
		const { body } = await getStatus();
		expect(body).toMatchObject({ state: 'done', analyzedCount: 4 });
	});
});
