import { countEncounters } from '#lib/server/analysis/encounters.ts';
import { errors, toErrorResponse } from '#lib/server/errors.ts';
import { analyzer } from '#lib/server/services.ts';
import type { RequestHandler } from './$types';

const MAX_PLAYERS = 10;

/** Badges 👥 : nombre de parties communes pour les joueurs d'un match (aucun appel à Riot). */
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const puuids = (url.searchParams.get('with') ?? '').split(',').filter(Boolean);
		if (puuids.length === 0 || puuids.length > MAX_PLAYERS) throw errors.invalidRequest();

		const analysis = await analyzer.getAnalysis(params.puuid);
		if (!analysis) throw errors.referenceNotAnalyzed();
		return Response.json({ counts: countEncounters(analysis, puuids) });
	} catch (err) {
		return toErrorResponse(err);
	}
};
