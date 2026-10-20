import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REF, sampleAnalysis } from '../../../../tests/fixtures/app/analysis.ts';
import { type AnalysisStore, InMemoryAnalysisStore, JsonFileAnalysisStore } from './store.ts';

let dir: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), 'leagueapp-store-'));
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe.each<[string, () => AnalysisStore]>([
	['JsonFileAnalysisStore', () => new JsonFileAnalysisStore(join(dir, 'analyses'))],
	['InMemoryAnalysisStore', () => new InMemoryAnalysisStore()]
])('%s', (_name, createStore) => {
	it('renvoie null pour un PUUID jamais analysé', async () => {
		expect(await createStore().load('puuid-inconnu')).toBeNull();
	});

	it('fait l’aller-retour save / load à l’identique', async () => {
		const store = createStore();
		await store.save(sampleAnalysis());
		expect(await store.load(REF)).toEqual(sampleAnalysis());
	});
});

describe('JsonFileAnalysisStore', () => {
	it('écrit data/analyses/{puuid}.json avec schemaVersion 1', async () => {
		const store = new JsonFileAnalysisStore(join(dir, 'analyses'));
		await store.save(sampleAnalysis());
		const content = JSON.parse(await readFile(join(dir, 'analyses', `${REF}.json`), 'utf8'));
		expect(content.schemaVersion).toBe(1);
		expect(content.puuid).toBe(REF);
	});

	it('ne laisse aucun fichier temporaire après l’écriture', async () => {
		const store = new JsonFileAnalysisStore(join(dir, 'analyses'));
		await store.save(sampleAnalysis());
		expect(await readdir(join(dir, 'analyses'))).toEqual([`${REF}.json`]);
	});

	it('ne corrompt pas le fichier existant si une écriture échoue', async () => {
		const store = new JsonFileAnalysisStore(join(dir, 'analyses'));
		await store.save(sampleAnalysis());
		const broken = sampleAnalysis() as unknown as Record<string, unknown>;
		broken.self = broken; // référence circulaire : JSON.stringify échoue
		await expect(store.save(broken as never)).rejects.toThrow();
		expect(await store.load(REF)).toEqual(sampleAnalysis());
		expect(await readdir(join(dir, 'analyses'))).toEqual([`${REF}.json`]);
	});

	it('ignore un fichier illisible au lieu de planter', async () => {
		const store = new JsonFileAnalysisStore(join(dir, 'analyses'));
		await store.save(sampleAnalysis());
		await writeFile(join(dir, 'analyses', `${REF}.json`), '{ pas du json');
		expect(await store.load(REF)).toBeNull();
	});
});
