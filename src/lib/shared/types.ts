// Types partagés entre le serveur et l'interface (voir specs/001-historique-joueur/data-model.md).
// Aucun secret ici : ce fichier part dans le navigateur.

export type Platform =
	| 'euw1'
	| 'eun1'
	| 'tr1'
	| 'ru'
	| 'me1'
	| 'na1'
	| 'br1'
	| 'la1'
	| 'la2'
	| 'kr'
	| 'jp1'
	| 'oc1'
	| 'sg2'
	| 'tw2'
	| 'vn2';

/** Identité permanente d'un joueur : seule clé de comparaison fiable (FR-014). */
export type Puuid = string;

export interface RiotId {
	gameName: string;
	tagLine: string;
}

/** `remake` = partie écourtée sans résultat, jamais comptée en victoire ou défaite. */
export type MatchOutcome = 'win' | 'loss' | 'remake';

/** `teamId` 100 → `blue`, 200 → `red`. */
export type TeamSide = 'blue' | 'red';

export interface PlayerProfile {
	puuid: Puuid;
	gameName: string;
	tagLine: string;
	platform: Platform;
	profileIconUrl: string;
	summonerLevel: number;
}

export interface Participant {
	/** `null` pour un bot. */
	puuid: Puuid | null;
	/** Riot ID au moment de la partie ; `null` pour un bot. */
	gameName: string | null;
	tagLine: string | null;
	isBot: boolean;
	championName: string;
	championIconUrl: string;
	side: TeamSide;
	kills: number;
	deaths: number;
	assists: number;
}

export interface Team {
	side: TeamSide;
	outcome: MatchOutcome;
	participants: Participant[];
}

export interface MatchSummary {
	matchId: string;
	queueLabel: string;
	/** ISO 8601 */
	playedAt: string;
	durationSeconds: number;
	player: Participant;
	outcome: MatchOutcome;
	teams: [Team, Team];
}

export interface MatchPage {
	matches: MatchSummary[];
	hasMore: boolean;
	/** Matchs refusés par Riot (403/404) et donc omis. */
	skipped: number;
}

/** Compte de référence (« moi »), stocké uniquement dans le navigateur (FR-009). */
export interface ReferenceAccount {
	puuid: Puuid;
	gameName: string;
	tagLine: string;
	platform: Platform;
}

export type AnalysisState = 'never' | 'running' | 'done' | 'failed';

export interface AnalysisStatus {
	state: AnalysisState;
	processed: number;
	total: number;
	lastAnalyzedAt: string | null;
	analyzedCount: number;
	unavailableCount: number;
	oldestMatchAt: string | null;
	error: ApiError | null;
}

export interface EncounterStats {
	games: number;
	wins: number;
	losses: number;
	remakes: number;
}

export interface EncounterGame {
	matchId: string;
	playedAt: string;
	queueLabel: string;
	relation: 'same-team' | 'opponent';
	referenceChampion: string;
	otherChampion: string;
	referenceOutcome: MatchOutcome;
}

export interface EncounterSummary {
	otherPuuid: Puuid;
	isSelf: boolean;
	total: number;
	sameTeam: EncounterStats;
	opponents: EncounterStats;
	lastPlayedAt: string | null;
	games: EncounterGame[];
	period: { analyzedCount: number; oldestMatchAt: string | null };
}

/** Nombre de parties communes par joueur ; les joueurs jamais croisés sont absents (FR-010a). */
export type EncounterCounts = Record<Puuid, number>;

export type ApiErrorCode =
	| 'INVALID_RIOT_ID'
	| 'INVALID_PLATFORM'
	| 'INVALID_REQUEST'
	| 'PLAYER_NOT_FOUND'
	| 'REFERENCE_NOT_ANALYZED'
	| 'ANALYSIS_ALREADY_RUNNING'
	| 'RIOT_RATE_LIMITED'
	| 'RIOT_API_KEY_INVALID'
	| 'RIOT_UNAVAILABLE'
	| 'INTERNAL_ERROR';

export interface ApiError {
	code: ApiErrorCode;
	/** Texte français prêt à afficher. */
	message: string;
	retryAfterSeconds?: number;
}

// --- Feature 002 : partie en cours (specs/002-live-game-card/data-model.md) ---

/** Joueur minimal, suffisant pour le panneau « parties communes ». */
export interface PlayerRef {
	puuid: Puuid | null;
	gameName: string | null;
	tagLine: string | null;
}

export interface LiveParticipant {
	/** `null` si Riot masque l'identité du joueur (FR-006a). */
	puuid: Puuid | null;
	isHidden: boolean;
	/** `''` si le joueur est masqué. */
	gameName: string;
	tagLine: string;
	championName: string;
	/** `null` si le champion est inconnu de Data Dragon. */
	championIconUrl: string | null;
	side: TeamSide;
}

export interface LiveTeam {
	side: TeamSide;
	participants: LiveParticipant[];
}

export interface LiveGame {
	gameId: number;
	queueLabel: string;
	/** ISO 8601 ; `null` pendant l'écran de chargement. */
	startedAt: string | null;
	teams: [LiveTeam, LiveTeam];
}

export type LiveGameResult =
	| { state: 'in-game'; game: LiveGame }
	| { state: 'other-mode'; queueLabel: string }
	| { state: 'not-in-game' };

export type RankedStats =
	| {
			status: 'ranked';
			tier: string;
			tierLabel: string;
			/** `null` pour Maître, Grand Maître et Challenger. */
			division: string | null;
			leaguePoints: number;
			wins: number;
			losses: number;
			winRate: number;
	  }
	| { status: 'unranked' }
	| { status: 'unavailable' };

export type RankedStatsMap = Record<Puuid, RankedStats>;
