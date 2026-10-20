// Analyse incrémentale des 100 dernières parties du compte de référence (FR-012, FR-012a/b, R11).
import type { AnalysisStatus, Platform, Puuid } from '#lib/shared/types.ts';
import { errors, toAppError } from '../errors.ts';
import { MatchUnavailableError, type RiotClient } from '../riot/client.ts';
import { isBotParticipant, outcomeOf, sideOf } from '../riot/match-utils.ts';
import type { MatchDto } from '../riot/schemas.ts';
import { oldestMatchAt } from './encounters.ts';
import type { Analysis, AnalysisStore, AnalyzedMatch } from './store.ts';

export interface AnalyzerOptions {
	riot: RiotClient;
	store: AnalysisStore;
	now?: () => number;
	/** Nombre de parties analysées (FR-012). */
	windowSize?: number;
	/** Sauvegarde intermédiaire tous les N matchs : une analyse interrompue reprend où elle était. */
	saveEvery?: number;
}

interface Run {
	status: AnalysisStatus;
	done: Promise<void>;
}

function toAnalyzedMatch(match: MatchDto, puuid: Puuid): AnalyzedMatch | null {
	const reference = match.info.participants.find((p) => p.puuid === puuid);
	if (!reference) return null;
	return {
		matchId: match.metadata.matchId,
		playedAt: new Date(match.info.gameStartTimestamp).toISOString(),
		queueId: match.info.queueId,
		referenceChampion: reference.championName,
		referenceSide: sideOf(reference.teamId),
		referenceOutcome: outcomeOf(reference),
		others: match.info.participants
			.filter((p) => p !== reference && !isBotParticipant(p))
			.map((p) => ({
				puuid: p.puuid,
				gameName: p.riotIdGameName,
				tagLine: p.riotIdTagline,
				championName: p.championName,
				side: sideOf(p.teamId)
			}))
	};
}

function statusFrom(analysis: Analysis | null): AnalysisStatus {
	const analyzedCount = analysis ? Object.keys(analysis.matches).length : 0;
	return {
		state: analysis?.lastAnalyzedAt ? 'done' : 'never',
		processed: 0,
		total: 0,
		lastAnalyzedAt: analysis?.lastAnalyzedAt ?? null,
		analyzedCount,
		unavailableCount: analysis?.unavailableMatchIds.length ?? 0,
		oldestMatchAt: analysis ? oldestMatchAt(analysis) : null,
		error: null
	};
}

export function createAnalyzer({
	riot,
	store,
	now = Date.now,
	windowSize = 100,
	saveEvery = 10
}: AnalyzerOptions) {
	const runs = new Map<Puuid, Run>();

	async function run(puuid: Puuid, platform: Platform, status: AnalysisStatus): Promise<void> {
		const analysis: Analysis = (await store.load(puuid)) ?? {
			schemaVersion: 1,
			puuid,
			platform,
			lastAnalyzedAt: null,
			windowMatchIds: [],
			matches: {},
			unavailableMatchIds: []
		};
		analysis.platform = platform;

		const ids = await riot.getMatchIds(
			puuid,
			platform,
			{ start: 0, count: windowSize },
			'background'
		);
		const window = new Set(ids);

		// Fenêtre glissante : on oublie les matchs sortis des 100 derniers.
		for (const matchId of Object.keys(analysis.matches)) {
			if (!window.has(matchId)) delete analysis.matches[matchId];
		}
		analysis.unavailableMatchIds = analysis.unavailableMatchIds.filter((id) => window.has(id));
		analysis.windowMatchIds = ids;

		const known = new Set([...Object.keys(analysis.matches), ...analysis.unavailableMatchIds]);
		const toFetch = ids.filter((id) => !known.has(id));
		status.total = toFetch.length;

		for (const matchId of toFetch) {
			try {
				const analyzed = toAnalyzedMatch(
					await riot.getMatch(matchId, platform, 'background'),
					puuid
				);
				if (analyzed) analysis.matches[matchId] = analyzed;
				else analysis.unavailableMatchIds.push(matchId);
			} catch (err) {
				if (!(err instanceof MatchUnavailableError)) {
					await store.save(analysis); // garde la progression avant d'abandonner
					throw err;
				}
				analysis.unavailableMatchIds.push(matchId);
			}
			status.processed += 1;
			if (status.processed % saveEvery === 0) await store.save(analysis);
		}

		analysis.lastAnalyzedAt = new Date(now()).toISOString();
		await store.save(analysis);
		Object.assign(status, statusFrom(analysis), {
			processed: status.processed,
			total: status.total
		});
	}

	return {
		/** Démarre l'analyse en arrière-plan ; refuse si une analyse tourne déjà pour ce compte. */
		startAnalysis(puuid: Puuid, platform: Platform): AnalysisStatus {
			if (runs.get(puuid)?.status.state === 'running') throw errors.analysisAlreadyRunning();

			const status: AnalysisStatus = { ...statusFrom(null), state: 'running' };
			const done = run(puuid, platform, status).catch((err: unknown) => {
				status.state = 'failed';
				status.error = toAppError(err).toApiError();
			});
			runs.set(puuid, { status, done });
			return { ...status };
		},

		async getStatus(puuid: Puuid): Promise<AnalysisStatus> {
			const current = runs.get(puuid);
			if (current && current.status.state !== 'done') return { ...current.status };
			const saved = statusFrom(await store.load(puuid));
			return current
				? { ...saved, processed: current.status.processed, total: current.status.total }
				: saved;
		},

		/** L'analyse utilisable pour les parties communes : seulement si elle est allée au bout une fois. */
		async getAnalysis(puuid: Puuid): Promise<Analysis | null> {
			const analysis = await store.load(puuid);
			return analysis?.lastAnalyzedAt ? analysis : null;
		},

		/** Attend la fin de l'analyse en cours (utile aux tests). */
		async whenIdle(puuid: Puuid): Promise<void> {
			await runs.get(puuid)?.done;
		}
	};
}

export type Analyzer = ReturnType<typeof createAnalyzer>;
