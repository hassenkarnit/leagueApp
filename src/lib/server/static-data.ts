// Données statiques hors API à quota : Data Dragon (icônes) et libellés des modes de jeu (R13).
import { z } from 'zod';
import { TtlCache } from './cache.ts';

const DDRAGON = 'https://ddragon.leagueoflegends.com';
const VERSIONS_URL = `${DDRAGON}/api/versions.json`;
const QUEUES_URL = 'https://static.developer.riotgames.com/docs/lol/queues.json';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
/** Utilisée seulement si Data Dragon est injoignable, pour que les icônes restent affichables. */
const FALLBACK_VERSION = '16.20.1';

const QUEUE_LABELS: Record<number, string> = {
	0: 'Partie personnalisée',
	400: 'Normale – Draft',
	420: 'Classée Solo/Duo',
	430: 'Normale – Aveugle',
	440: 'Classée Flex',
	450: 'ARAM',
	490: 'Partie rapide',
	900: 'URF',
	1700: 'Arena'
};

const VersionsDto = z.array(z.string()).min(1);
const QueuesDto = z.array(z.object({ queueId: z.number(), description: z.string().nullable() }));

export function createStaticData({ now = Date.now }: { now?: () => number } = {}) {
	const cache = new TtlCache<string, unknown>({ ttlMs: SIX_HOURS_MS, now });

	async function fetchJson<S extends z.ZodType>(url: string, schema: S): Promise<z.infer<S>> {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`${url} : HTTP ${response.status}`);
		return schema.parse(await response.json());
	}

	async function getVersion(): Promise<string> {
		try {
			const versions = (await cache.getOrLoad('versions', () =>
				fetchJson(VERSIONS_URL, VersionsDto)
			)) as string[];
			return versions[0];
		} catch {
			return FALLBACK_VERSION;
		}
	}

	async function getQueueDescriptions(): Promise<Map<number, string>> {
		try {
			const queues = (await cache.getOrLoad('queues', () =>
				fetchJson(QUEUES_URL, QueuesDto)
			)) as z.infer<typeof QueuesDto>;
			return new Map(
				queues.flatMap((q) => (q.description ? [[q.queueId, q.description] as const] : []))
			);
		} catch {
			return new Map();
		}
	}

	return {
		getVersion,

		async championIconUrl(championName: string): Promise<string> {
			return `${DDRAGON}/cdn/${await getVersion()}/img/champion/${championName}.png`;
		},

		async profileIconUrl(profileIconId: number): Promise<string> {
			return `${DDRAGON}/cdn/${await getVersion()}/img/profileicon/${profileIconId}.png`;
		},

		async getQueueLabel(queueId: number): Promise<string> {
			const label = QUEUE_LABELS[queueId] ?? (await getQueueDescriptions()).get(queueId);
			return label ?? `Mode ${queueId}`;
		}
	};
}

export type StaticData = ReturnType<typeof createStaticData>;
