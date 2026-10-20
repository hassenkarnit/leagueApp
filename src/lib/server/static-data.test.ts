import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { DDRAGON_VERSIONS_URL, QUEUES_URL } from '../../../tests/msw/handlers.ts';
import { server } from '../../../tests/msw/server.ts';
import { createStaticData } from './static-data.ts';

function setup() {
	let time = 0;
	const staticData = createStaticData({ now: () => time });
	return { staticData, advance: (ms: number) => (time += ms) };
}

describe('Data Dragon', () => {
	it('utilise la version la plus récente (versions.json[0])', async () => {
		const { staticData } = setup();
		expect(await staticData.getVersion()).toBe('16.20.1');
	});

	it('construit les URL d’icônes', async () => {
		const { staticData } = setup();
		expect(await staticData.championIconUrl('Ahri')).toBe(
			'https://ddragon.leagueoflegends.com/cdn/16.20.1/img/champion/Ahri.png'
		);
		expect(await staticData.profileIconUrl(4568)).toBe(
			'https://ddragon.leagueoflegends.com/cdn/16.20.1/img/profileicon/4568.png'
		);
	});

	it('met la version en cache 6 h', async () => {
		let calls = 0;
		server.use(
			http.get(DDRAGON_VERSIONS_URL, () => {
				calls += 1;
				return HttpResponse.json([`16.${calls}.1`]);
			})
		);
		const { staticData, advance } = setup();
		await staticData.getVersion();
		advance(6 * 60 * 60 * 1000 - 1);
		expect(await staticData.getVersion()).toBe('16.1.1');
		advance(1);
		expect(await staticData.getVersion()).toBe('16.2.1');
	});
});

describe('libellés des modes de jeu', () => {
	it.each([
		[420, 'Classée Solo/Duo'],
		[440, 'Classée Flex'],
		[400, 'Normale – Draft'],
		[430, 'Normale – Aveugle'],
		[450, 'ARAM'],
		[490, 'Partie rapide'],
		[1700, 'Arena'],
		[900, 'URF']
	])('file %i → « %s »', async (queueId, label) => {
		const { staticData } = setup();
		expect(await staticData.getQueueLabel(queueId)).toBe(label);
	});

	it('se replie sur la description de queues.json pour une file inconnue', async () => {
		const { staticData } = setup();
		expect(await staticData.getQueueLabel(890)).toBe('Co-op vs. AI Intermediate Bot games');
	});

	it('reste utilisable si queues.json est indisponible', async () => {
		server.use(http.get(QUEUES_URL, () => HttpResponse.error()));
		const { staticData } = setup();
		expect(await staticData.getQueueLabel(890)).toBe('Mode 890');
	});

	it('nomme les parties personnalisées', async () => {
		const { staticData } = setup();
		expect(await staticData.getQueueLabel(0)).toBe('Partie personnalisée');
	});
});
