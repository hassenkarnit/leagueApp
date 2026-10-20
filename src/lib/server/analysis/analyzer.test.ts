import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { analyzedMatch } from '../../../../tests/fixtures/app/analysis.ts';
import { RIOT_PATHS, recordedRiotRequests, riotError } from '../../../../tests/msw/handlers.ts';
import { server } from '../../../../tests/msw/server.ts';
import { createRiotClient } from '../riot/client.ts';
import { createLimiterRegistry } from '../riot/rate-limiter.ts';
import { createAnalyzer } from './analyzer.ts';
import { InMemoryAnalysisStore } from './store.ts';

const REF = 'puuid-reference';
const NOW = Date.parse('2026-10-20T12:00:00.000Z');

function setup(options: { saveEvery?: number } = {}) {
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
	const store = new InMemoryAnalysisStore();
	const analyzer = createAnalyzer({ riot, store, now: () => NOW, ...options });
	return { analyzer, store, riot };
}

async function analyze(analyzer: ReturnType<typeof setup>['analyzer']) {
	analyzer.startAnalysis(REF, 'euw1');
	await analyzer.whenIdle(REF);
	return analyzer.getStatus(REF);
}

describe('analyseur', () => {
	it('état « never » avant toute analyse', async () => {
		const { analyzer } = setup();
		expect(await analyzer.getStatus(REF)).toMatchObject({ state: 'never', lastAnalyzedAt: null });
	});

	it('1re analyse : 1 appel IDs (count=100) puis 1 appel par match, en priorité « background »', async () => {
		const { analyzer, riot } = setup();
		const getMatch = vi.spyOn(riot, 'getMatch');
		const status = await analyze(analyzer);

		const idsRequest = recordedRiotRequests.find((r) => r.url.includes('/ids'));
		expect(new URL(idsRequest!.url).searchParams.get('count')).toBe('100');
		expect(getMatch).toHaveBeenCalledTimes(4);
		for (const call of getMatch.mock.calls) expect(call[2]).toBe('background');

		expect(status).toMatchObject({
			state: 'done',
			processed: 4,
			total: 4,
			analyzedCount: 4,
			unavailableCount: 0,
			lastAnalyzedAt: new Date(NOW).toISOString(),
			oldestMatchAt: new Date(1792500000000 - 3 * 86400000).toISOString(),
			error: null
		});
	});

	it('stocke les autres joueurs (bots exclus) de chaque match', async () => {
		const { analyzer, store } = setup();
		await analyze(analyzer);
		const analysis = await store.load(REF);
		expect(analysis!.matches['EUW1_1001']).toMatchObject({
			referenceChampion: 'Ahri',
			referenceSide: 'blue',
			referenceOutcome: 'win',
			queueId: 420
		});
		expect(analysis!.matches['EUW1_1001'].others).toHaveLength(9);
		expect(analysis!.matches['EUW1_1004'].others).toHaveLength(4); // 5 bots exclus
		expect(analysis!.matches['EUW1_1003'].referenceOutcome).toBe('remake');
	});

	it('2e analyse : ne redemande aucun match déjà analysé', async () => {
		const { analyzer, riot } = setup();
		await analyze(analyzer);
		const getMatch = vi.spyOn(riot, 'getMatch');
		const status = await analyze(analyzer);
		expect(getMatch).not.toHaveBeenCalled();
		expect(status).toMatchObject({ state: 'done', analyzedCount: 4 });
	});

	it('retire les matchs sortis de la fenêtre des 100 derniers', async () => {
		const { analyzer, store } = setup();
		await store.save({
			schemaVersion: 1,
			puuid: REF,
			platform: 'euw1',
			lastAnalyzedAt: '2026-01-01T00:00:00.000Z',
			windowMatchIds: ['EUW1_0999'],
			matches: { EUW1_0999: analyzedMatch('EUW1_0999', '2025-12-31T00:00:00.000Z') },
			unavailableMatchIds: []
		});
		await analyze(analyzer);
		const analysis = await store.load(REF);
		expect(Object.keys(analysis!.matches).sort()).toEqual([
			'EUW1_1001',
			'EUW1_1002',
			'EUW1_1003',
			'EUW1_1004'
		]);
		expect(analysis!.windowMatchIds).toEqual(['EUW1_1001', 'EUW1_1002', 'EUW1_1003', 'EUW1_1004']);
	});

	it('note un match refusé (403/404) comme indisponible et continue', async () => {
		server.use(
			http.get(RIOT_PATHS.match, ({ params }) =>
				params.matchId === 'EUW1_1002' ? riotError(403) : undefined
			)
		);
		const { analyzer, store, riot } = setup();
		const status = await analyze(analyzer);
		expect(status).toMatchObject({ state: 'done', analyzedCount: 3, unavailableCount: 1 });
		expect((await store.load(REF))!.unavailableMatchIds).toEqual(['EUW1_1002']);

		// Un match indisponible n'est jamais redemandé.
		const getMatch = vi.spyOn(riot, 'getMatch');
		await analyze(analyzer);
		expect(getMatch).not.toHaveBeenCalled();
	});

	it('sauvegarde la progression régulièrement, sans date de fin avant la fin', async () => {
		const { analyzer, store } = setup({ saveEvery: 2 });
		// Copie à chaque sauvegarde : l'objet continue d'évoluer pendant l'analyse.
		const snapshots: Array<{ lastAnalyzedAt: string | null; matchCount: number }> = [];
		const save = store.save.bind(store);
		vi.spyOn(store, 'save').mockImplementation(async (analysis) => {
			snapshots.push({
				lastAnalyzedAt: analysis.lastAnalyzedAt,
				matchCount: Object.keys(analysis.matches).length
			});
			return save(analysis);
		});
		await analyze(analyzer);
		expect(snapshots[0]).toEqual({ lastAnalyzedAt: null, matchCount: 2 });
		expect(snapshots.at(-1)).toEqual({
			lastAnalyzedAt: new Date(NOW).toISOString(),
			matchCount: 4
		});
	});

	it('passe en échec avec RIOT_API_KEY_INVALID si la clé est refusée', async () => {
		server.use(http.get(RIOT_PATHS.matchIds, () => riotError(401)));
		const { analyzer } = setup();
		const status = await analyze(analyzer);
		expect(status.state).toBe('failed');
		expect(status.error?.code).toBe('RIOT_API_KEY_INVALID');
	});

	it('refuse une 2e analyse tant que la 1re tourne', async () => {
		const { analyzer } = setup();
		analyzer.startAnalysis(REF, 'euw1');
		expect(() => analyzer.startAnalysis(REF, 'euw1')).toThrow(
			expect.objectContaining({ code: 'ANALYSIS_ALREADY_RUNNING' })
		);
		expect((await analyzer.getStatus(REF)).state).toBe('running');
		await analyzer.whenIdle(REF);
	});

	it('getAnalysis ne renvoie qu’une analyse terminée au moins une fois', async () => {
		const { analyzer } = setup();
		expect(await analyzer.getAnalysis(REF)).toBeNull();
		await analyze(analyzer);
		expect(await analyzer.getAnalysis(REF)).not.toBeNull();
	});
});
