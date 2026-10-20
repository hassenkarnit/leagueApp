import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FRIEND, REF, sampleAnalysis } from '../../../../../../tests/fixtures/app/analysis.ts';
import { requestEvent } from '../../../../../../tests/helpers/request-event.ts';
import { analysisStore } from '#lib/server/services.ts';
import { GET as getCounts } from './+server.ts';
import { GET as getSummary } from './[otherPuuid]/+server.ts';

vi.mock('#lib/server/services.ts', async () => {
	const { createTestServices } = await import('../../../../../../tests/helpers/services.ts');
	return createTestServices();
});

type CountsEvent = Parameters<typeof getCounts>[0];
type SummaryEvent = Parameters<typeof getSummary>[0];

async function counts(puuid: string, query: string) {
	const url = `http://localhost/api/reference/${puuid}/encounters${query}`;
	const response = await getCounts(requestEvent<CountsEvent>({ puuid }, url));
	return { status: response.status, body: await response.json() };
}

async function summary(puuid: string, otherPuuid: string) {
	const url = `http://localhost/api/reference/${puuid}/encounters/${otherPuuid}`;
	const response = await getSummary(requestEvent<SummaryEvent>({ puuid, otherPuuid }, url));
	return { status: response.status, body: await response.json() };
}

describe('sans analyse', () => {
	it('404 REFERENCE_NOT_ANALYZED pour les badges et le résumé', async () => {
		const a = await counts('puuid-sans-analyse', `?with=${FRIEND}`);
		const b = await summary('puuid-sans-analyse', FRIEND);
		expect([a.status, b.status]).toEqual([404, 404]);
		expect(a.body.error.code).toBe('REFERENCE_NOT_ANALYZED');
		expect(b.body.error.code).toBe('REFERENCE_NOT_ANALYZED');
	});
});

describe('avec une analyse', () => {
	beforeEach(async () => {
		await analysisStore.save(sampleAnalysis());
	});

	it('GET encounters?with=… → { counts } des seuls joueurs croisés', async () => {
		const { status, body } = await counts(REF, `?with=${FRIEND},puuid-inconnu`);
		expect(status).toBe(200);
		expect(body).toEqual({ counts: { [FRIEND]: 3 } });
	});

	it.each(['', '?with=', `?with=${Array.from({ length: 11 }, (_, i) => `p${i}`).join(',')}`])(
		'400 INVALID_REQUEST pour « %s » (1 à 10 PUUID)',
		async (query) => {
			const { status, body } = await counts(REF, query);
			expect(status).toBe(400);
			expect(body.error.code).toBe('INVALID_REQUEST');
		}
	);

	it('GET encounters/{otherPuuid} → résumé conforme au contrat', async () => {
		const { status, body } = await summary(REF, FRIEND);
		expect(status).toBe(200);
		expect(body).toMatchObject({
			otherPuuid: FRIEND,
			isSelf: false,
			total: 3,
			sameTeam: { games: 2, wins: 1, losses: 0, remakes: 1 },
			opponents: { games: 1, wins: 0, losses: 1, remakes: 0 },
			period: { analyzedCount: 4 }
		});
		expect(body.games[0].queueLabel).toBe('Classée Solo/Duo');
	});

	it('total 0 pour un inconnu, isSelf pour soi-même', async () => {
		expect((await summary(REF, 'puuid-inconnu')).body.total).toBe(0);
		expect((await summary(REF, REF)).body.isSelf).toBe(true);
	});
});
