import { listRecurringPlayers } from '#lib/server/analysis/encounters.ts';
import { errors, toErrorResponse } from '#lib/server/errors.ts';
import { analyzer } from '#lib/server/services.ts';
import type { RequestHandler } from './$types';

/** Joueurs croisés au moins 2 fois (avec ou contre moi), d'après l'analyse (aucun appel à Riot). */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const analysis = await analyzer.getAnalysis(params.puuid);
		if (!analysis) throw errors.referenceNotAnalyzed();
		return Response.json({ players: listRecurringPlayers(analysis) });
	} catch (err) {
		return toErrorResponse(err);
	}
};
