import { toErrorResponse } from '#lib/server/errors.ts';
import { parsePlatformParam, parseRiotIdParam } from '#lib/server/players.ts';
import { liveGame, players } from '#lib/server/services.ts';
import type { RequestHandler } from './$types';

/** Partie en cours d'un joueur — appelée uniquement au clic sur « Actualiser » (FR-001). */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const platform = parsePlatformParam(params.platform);
		const riotId = parseRiotIdParam(params.riotId);
		const puuid = await players.getPuuid(platform, riotId);
		return Response.json(await liveGame.getLiveGame(platform, puuid));
	} catch (err) {
		return toErrorResponse(err);
	}
};
