import { errors, toErrorResponse } from '#lib/server/errors.ts';
import { parsePlatformParam } from '#lib/server/players.ts';
import { analyzer } from '#lib/server/services.ts';
import type { RequestHandler } from './$types';

/** État de l'analyse, interrogé chaque seconde par l'interface pendant qu'elle tourne. */
export const GET: RequestHandler = async ({ params }) => {
	try {
		return Response.json(await analyzer.getStatus(params.puuid));
	} catch (err) {
		return toErrorResponse(err);
	}
};

/** Bouton « Analyser mon historique » : démarre l'analyse en arrière-plan (202). */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body: unknown = await request.json().catch(() => null);
		if (typeof body !== 'object' || body === null || !('platform' in body)) {
			throw errors.invalidRequest();
		}
		const platform = parsePlatformParam(String(body.platform));
		return Response.json(analyzer.startAnalysis(params.puuid, platform), { status: 202 });
	} catch (err) {
		return toErrorResponse(err);
	}
};
