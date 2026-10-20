import { errors, toErrorResponse } from '#lib/server/errors.ts';
import { parsePlatformParam } from '#lib/server/players.ts';
import { liveGame } from '#lib/server/services.ts';
import type { RequestHandler } from './$types';

const MAX_PLAYERS = 10;

/** Rang et statistiques Solo/Duo des joueurs d'une partie (cache 10 min par joueur). */
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const platform = parsePlatformParam(params.platform);
		const puuids = (url.searchParams.get('puuids') ?? '').split(',').filter(Boolean);
		if (puuids.length === 0 || puuids.length > MAX_PLAYERS) throw errors.invalidRequest();
		return Response.json({ stats: await liveGame.getRankedStats(platform, puuids) });
	} catch (err) {
		return toErrorResponse(err);
	}
};
