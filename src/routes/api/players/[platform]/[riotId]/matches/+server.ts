import { errors, toErrorResponse } from '#lib/server/errors.ts';
import { parsePlatformParam, parseRiotIdParam } from '#lib/server/players.ts';
import { players } from '#lib/server/services.ts';
import type { RequestHandler } from './$types';

const MAX_PAGE_SIZE = 20;

/** Lit un entier de la query string, avec une valeur par défaut et des bornes. */
function integerParam(url: URL, name: string, fallback: number, min: number, max: number) {
	const raw = url.searchParams.get(name);
	if (raw === null) return fallback;
	const value = Number(raw);
	if (!Number.isInteger(value) || value < min || value > max) throw errors.invalidRequest();
	return value;
}

/** Historique paginé, du plus récent au plus ancien (contracts/api.openapi.yaml). */
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const platform = parsePlatformParam(params.platform);
		const riotId = parseRiotIdParam(params.riotId);
		const start = integerParam(url, 'start', 0, 0, Number.MAX_SAFE_INTEGER);
		const count = integerParam(url, 'count', MAX_PAGE_SIZE, 1, MAX_PAGE_SIZE);
		return Response.json(await players.getMatchPage(platform, riotId, start, count));
	} catch (err) {
		return toErrorResponse(err);
	}
};
