import { summarizeEncounter } from '#lib/server/analysis/encounters.ts';
import { errors, toErrorResponse } from '#lib/server/errors.ts';
import { analyzer, staticData } from '#lib/server/services.ts';
import type { RequestHandler } from './$types';

/** Résumé et détail des parties communes avec un joueur. */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const analysis = await analyzer.getAnalysis(params.puuid);
		if (!analysis) throw errors.referenceNotAnalyzed();

		const queueIds = [...new Set(Object.values(analysis.matches).map((m) => m.queueId))];
		const labels = new Map(
			await Promise.all(
				queueIds.map(async (id) => [id, await staticData.getQueueLabel(id)] as const)
			)
		);
		return Response.json(
			summarizeEncounter(analysis, params.otherPuuid, (id) => labels.get(id) ?? `Mode ${id}`)
		);
	} catch (err) {
		return toErrorResponse(err);
	}
};
