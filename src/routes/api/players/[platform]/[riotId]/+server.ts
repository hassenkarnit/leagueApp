import { toErrorResponse } from '#lib/server/errors.ts';
import { parsePlatformParam, parseRiotIdParam } from '#lib/server/players.ts';
import { players } from '#lib/server/services.ts';
import type { RequestHandler } from './$types';

/** Profil d'un joueur (contracts/api.openapi.yaml). */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const platform = parsePlatformParam(params.platform);
		const riotId = parseRiotIdParam(params.riotId);
		return Response.json(await players.getProfile(platform, riotId));
	} catch (err) {
		return toErrorResponse(err);
	}
};
