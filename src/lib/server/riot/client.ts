// Client unique de l'API Riot (principe II) : authentification, limiteur, validation, erreurs typées.
import type { Platform, Puuid, RiotId } from '#lib/shared/types.ts';
import type { z } from 'zod';
import { errors } from '../errors.ts';
import type { Priority, RateLimiter } from './rate-limiter.ts';
import { hostFor, regionsFor } from './routing.ts';
import { AccountDto, MatchDto, MatchIdsDto, SummonerDto } from './schemas.ts';

/** Un match refusé par Riot (403/404 par conception : Brawl, ARAM Mayhem…) — ignoré, jamais affiché. */
export class MatchUnavailableError extends Error {
	constructor(readonly matchId: string) {
		super(`Match ${matchId} indisponible`);
		this.name = 'MatchUnavailableError';
	}
}

export interface RiotClientOptions {
	apiKey: () => string;
	limiterFor: (host: string) => RateLimiter;
	logger?: Pick<Console, 'warn'>;
}

const KEY_WARNING =
	'[Riot] Clé API invalide ou expirée — régénère-la sur developer.riotgames.com puis mets à jour .env';

interface RequestSpec<S extends z.ZodType> {
	host: string;
	path: string;
	schema: S;
	method: string;
	priority: Priority;
	/** Pour getMatch : 403/404 signifient « match indisponible ». */
	matchId?: string;
}

export function createRiotClient({ apiKey, limiterFor, logger = console }: RiotClientOptions) {
	let keyWarningShown = false;

	function failure(status: number, spec: RequestSpec<z.ZodType>): Error {
		if (spec.matchId && (status === 403 || status === 404)) {
			return new MatchUnavailableError(spec.matchId);
		}
		if (status === 401 || status === 403) {
			if (!keyWarningShown) {
				logger.warn(KEY_WARNING);
				keyWarningShown = true;
			}
			return errors.riotApiKeyInvalid();
		}
		if (status === 404) return errors.playerNotFound();
		return errors.riotUnavailable();
	}

	async function request<S extends z.ZodType>(spec: RequestSpec<S>): Promise<z.infer<S>> {
		const limiter = limiterFor(spec.host);
		const url = `https://${spec.host}${spec.path}`;

		for (let attempt = 0; ; attempt++) {
			let response: Response;
			try {
				response = await limiter.schedule(
					() => fetch(url, { headers: { 'X-Riot-Token': apiKey() } }),
					{ priority: spec.priority, method: spec.method }
				);
			} catch {
				throw errors.riotUnavailable();
			}
			limiter.updateFromHeaders(response.headers, spec.method);

			if (response.status === 429) {
				const retryAfter = Number(response.headers.get('Retry-After'));
				const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 1;
				limiter.pauseFor(seconds);
				if (attempt === 0) continue;
				throw errors.riotRateLimited(seconds);
			}
			if (!response.ok) throw failure(response.status, spec);

			keyWarningShown = false;
			const parsed = spec.schema.safeParse(await response.json().catch(() => undefined));
			if (!parsed.success) throw errors.riotUnavailable();
			return parsed.data;
		}
	}

	return {
		getAccountByRiotId(riotId: RiotId, platform: Platform, priority: Priority = 'interactive') {
			const gameName = encodeURIComponent(riotId.gameName);
			const tagLine = encodeURIComponent(riotId.tagLine);
			return request({
				host: hostFor(regionsFor(platform).account),
				path: `/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`,
				schema: AccountDto,
				method: 'account.byRiotId',
				priority
			});
		},

		getSummonerByPuuid(puuid: Puuid, platform: Platform, priority: Priority = 'interactive') {
			regionsFor(platform); // valide la plateforme
			return request({
				host: hostFor(platform),
				path: `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`,
				schema: SummonerDto,
				method: 'summoner.byPuuid',
				priority
			});
		},

		getMatchIds(
			puuid: Puuid,
			platform: Platform,
			{ start, count }: { start: number; count: number },
			priority: Priority = 'interactive'
		) {
			const query = new URLSearchParams({ start: String(start), count: String(count) });
			return request({
				host: hostFor(regionsFor(platform).match),
				path: `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?${query}`,
				schema: MatchIdsDto,
				method: 'match.idsByPuuid',
				priority
			});
		},

		getMatch(matchId: string, platform: Platform, priority: Priority = 'interactive') {
			return request({
				host: hostFor(regionsFor(platform).match),
				path: `/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
				schema: MatchDto,
				method: 'match.getMatch',
				priority,
				matchId
			});
		}
	};
}

export type RiotClient = ReturnType<typeof createRiotClient>;
