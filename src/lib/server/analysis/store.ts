// Stockage de l'analyse du compte de référence (research.md R10).
// Interface remplaçable : fichier JSON aujourd'hui, SQLite demain si une feature en a besoin.
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MatchOutcome, Platform, Puuid, TeamSide } from '#lib/shared/types.ts';

/** Forme compacte d'un match analysé (~1 Ko), vue depuis le compte de référence. */
export interface AnalyzedMatch {
	matchId: string;
	playedAt: string;
	queueId: number;
	referenceChampion: string;
	referenceSide: TeamSide;
	referenceOutcome: MatchOutcome;
	/** Les autres joueurs humains du match (9 au plus, bots exclus). */
	others: Array<{
		puuid: Puuid;
		gameName: string;
		tagLine: string;
		championName: string;
		side: TeamSide;
	}>;
}

export interface Analysis {
	schemaVersion: 1;
	puuid: Puuid;
	platform: Platform;
	/** Fin de la dernière analyse réussie ; `null` tant qu'aucune n'est allée au bout. */
	lastAnalyzedAt: string | null;
	/** Les 100 derniers IDs de matchs lors de la dernière analyse (fenêtre glissante). */
	windowMatchIds: string[];
	matches: Record<string, AnalyzedMatch>;
	/** IDs refusés par Riot (403/404) : jamais redemandés. */
	unavailableMatchIds: string[];
}

export interface AnalysisStore {
	load(puuid: Puuid): Promise<Analysis | null>;
	save(analysis: Analysis): Promise<void>;
}

export class JsonFileAnalysisStore implements AnalysisStore {
	readonly #dir: string;

	constructor(dir = join('data', 'analyses')) {
		this.#dir = dir;
	}

	#fileFor(puuid: Puuid): string {
		return join(this.#dir, `${encodeURIComponent(puuid)}.json`);
	}

	async load(puuid: Puuid): Promise<Analysis | null> {
		try {
			const analysis = JSON.parse(await readFile(this.#fileFor(puuid), 'utf8')) as Analysis;
			return analysis.schemaVersion === 1 ? analysis : null;
		} catch {
			// Fichier absent ou illisible : on repart de zéro plutôt que de planter.
			return null;
		}
	}

	async save(analysis: Analysis): Promise<void> {
		const content = JSON.stringify(analysis, null, '\t');
		await mkdir(this.#dir, { recursive: true });
		const file = this.#fileFor(analysis.puuid);
		const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
		try {
			// Écriture atomique : un arrêt brutal ne laisse jamais un fichier à moitié écrit.
			await writeFile(temporary, content, 'utf8');
			await rename(temporary, file);
		} catch (err) {
			await rm(temporary, { force: true });
			throw err;
		}
	}
}

/** Pour les tests : même interface, aucune écriture disque. */
export class InMemoryAnalysisStore implements AnalysisStore {
	readonly #analyses = new Map<Puuid, string>();

	async load(puuid: Puuid): Promise<Analysis | null> {
		const saved = this.#analyses.get(puuid);
		return saved ? (JSON.parse(saved) as Analysis) : null;
	}

	async save(analysis: Analysis): Promise<void> {
		this.#analyses.set(analysis.puuid, JSON.stringify(analysis));
	}
}
