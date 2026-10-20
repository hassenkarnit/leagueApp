// Faux serveurs Riot / Data Dragon pour les tests (aucun appel réseau réel).
import { http, HttpResponse, type JsonBodyType } from 'msw';
import accountFriend from '../fixtures/riot/account-friend.json';
import accountReference from '../fixtures/riot/account-reference.json';
import activeGameRanked from '../fixtures/riot/active-game-ranked.json';
import champions from '../fixtures/riot/champion.json';
import ddragonVersions from '../fixtures/riot/ddragon-versions.json';
import leagueEntriesFlexOnly from '../fixtures/riot/league-entries-flex-only.json';
import leagueEntriesRanked from '../fixtures/riot/league-entries-ranked.json';
import matchCoopBots from '../fixtures/riot/match-coop-bots.json';
import matchIds from '../fixtures/riot/match-ids.json';
import matchRankedLoss from '../fixtures/riot/match-ranked-loss.json';
import matchRankedWin from '../fixtures/riot/match-ranked-win.json';
import matchRemake from '../fixtures/riot/match-remake.json';
import queues from '../fixtures/riot/queues.json';
import summoner from '../fixtures/riot/summoner.json';

export const RIOT_HOST = 'https://*.api.riotgames.com';

export const RIOT_PATHS = {
	accountByRiotId: `${RIOT_HOST}/riot/account/v1/accounts/by-riot-id/:gameName/:tagLine`,
	summonerByPuuid: `${RIOT_HOST}/lol/summoner/v4/summoners/by-puuid/:puuid`,
	matchIds: `${RIOT_HOST}/lol/match/v5/matches/by-puuid/:puuid/ids`,
	match: `${RIOT_HOST}/lol/match/v5/matches/:matchId`,
	activeGame: `${RIOT_HOST}/lol/spectator/v5/active-games/by-summoner/:puuid`,
	leagueEntries: `${RIOT_HOST}/lol/league/v4/entries/by-puuid/:puuid`
} as const;

export const DDRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
export const QUEUES_URL = 'https://static.developer.riotgames.com/docs/lol/queues.json';
export const CHAMPIONS_URL =
	'https://ddragon.leagueoflegends.com/cdn/:version/data/en_US/champion.json';

export const fixtures = {
	accounts: [accountReference, accountFriend],
	summoner,
	matchIds,
	matches: [matchRankedWin, matchRankedLoss, matchRemake, matchCoopBots]
};

/** En-têtes renvoyés par Riot sur chaque réponse réussie. */
const RATE_LIMIT_HEADERS = {
	'X-App-Rate-Limit': '20:1,100:120',
	'X-App-Rate-Limit-Count': '1:1,1:120'
};

/** Toutes les requêtes reçues par le faux Riot, pour vérifier ce que le code envoie. */
export const recordedRiotRequests: Request[] = [];

function riotJson(request: Request, body: JsonBodyType) {
	recordedRiotRequests.push(request);
	return HttpResponse.json(body, { headers: RATE_LIMIT_HEADERS });
}

function riotNotFound(request: Request) {
	recordedRiotRequests.push(request);
	return HttpResponse.json(
		{ status: { message: 'Data not found', status_code: 404 } },
		{ status: 404 }
	);
}

export const handlers = [
	http.get(RIOT_PATHS.accountByRiotId, ({ request, params }) => {
		const gameName = String(params.gameName).toLowerCase();
		const tagLine = String(params.tagLine).toLowerCase();
		const account = fixtures.accounts.find(
			(a) => a.gameName.toLowerCase() === gameName && a.tagLine.toLowerCase() === tagLine
		);
		return account ? riotJson(request, account) : riotNotFound(request);
	}),

	http.get(RIOT_PATHS.summonerByPuuid, ({ request, params }) =>
		riotJson(request, { ...fixtures.summoner, puuid: String(params.puuid) })
	),

	http.get(RIOT_PATHS.matchIds, ({ request }) => {
		const url = new URL(request.url);
		const start = Number(url.searchParams.get('start') ?? 0);
		const count = Number(url.searchParams.get('count') ?? 20);
		return riotJson(request, fixtures.matchIds.slice(start, start + count));
	}),

	http.get(RIOT_PATHS.match, ({ request, params }) => {
		const match = fixtures.matches.find((m) => m.metadata.matchId === params.matchId);
		return match ? riotJson(request, match) : riotNotFound(request);
	}),

	// Partie en cours : seul « puuid-reference » joue ; 404 au format propre à spectator sinon.
	http.get(RIOT_PATHS.activeGame, ({ request, params }) => {
		if (params.puuid === 'puuid-reference') return riotJson(request, activeGameRanked);
		recordedRiotRequests.push(request);
		return HttpResponse.json(
			{ httpStatus: 404, errorCode: 'NOT_FOUND', message: 'Not Found' },
			{ status: 404 }
		);
	}),

	http.get(RIOT_PATHS.leagueEntries, ({ request, params }) => {
		if (params.puuid === 'puuid-reference') return riotJson(request, leagueEntriesRanked);
		if (params.puuid === 'puuid-friend') return riotJson(request, leagueEntriesFlexOnly);
		return riotJson(request, []);
	}),

	http.get(DDRAGON_VERSIONS_URL, () => HttpResponse.json(ddragonVersions)),
	http.get(CHAMPIONS_URL, () => HttpResponse.json(champions)),
	http.get(QUEUES_URL, () => HttpResponse.json(queues))
];

/** Construit une réponse d'erreur Riot réaliste (401, 403, 404, 429, 503…). */
export function riotError(status: number, options: { retryAfter?: number } = {}) {
	const headers: Record<string, string> = {};
	if (options.retryAfter !== undefined) {
		headers['Retry-After'] = String(options.retryAfter);
		headers['X-Rate-Limit-Type'] = 'application';
	}
	return HttpResponse.json(
		{ status: { message: `Erreur ${status}`, status_code: status } },
		{ status, headers }
	);
}
