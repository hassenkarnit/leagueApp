import type { ApiError, ApiErrorCode } from '#lib/shared/types.ts';

/** Erreur prévue, traduite en réponse `{ error: ApiError }` par `toErrorResponse`. */
export class AppError extends Error {
	readonly code: ApiErrorCode;
	readonly status: number;
	readonly retryAfterSeconds?: number;

	constructor(code: ApiErrorCode, message: string, status: number, retryAfterSeconds?: number) {
		super(message);
		this.name = 'AppError';
		this.code = code;
		this.status = status;
		this.retryAfterSeconds = retryAfterSeconds;
	}

	toApiError(): ApiError {
		return this.retryAfterSeconds === undefined
			? { code: this.code, message: this.message }
			: { code: this.code, message: this.message, retryAfterSeconds: this.retryAfterSeconds };
	}
}

// Messages français de data-model.md — la clé API n'y apparaît jamais (principe I).
export const errors = {
	invalidRiotId: () =>
		new AppError(
			'INVALID_RIOT_ID',
			'Format attendu : Pseudo#TAG (3 à 16 caractères, puis 3 à 5 caractères après le #).',
			400
		),
	invalidPlatform: () => new AppError('INVALID_PLATFORM', 'Serveur inconnu.', 400),
	playerNotFound: () =>
		new AppError(
			'PLAYER_NOT_FOUND',
			'Joueur introuvable. Vérifie le pseudo, le tag et le serveur.',
			404
		),
	referenceNotAnalyzed: () =>
		new AppError('REFERENCE_NOT_ANALYZED', "Lance d'abord l'analyse de ton historique.", 404),
	analysisAlreadyRunning: () =>
		new AppError('ANALYSIS_ALREADY_RUNNING', 'Une analyse est déjà en cours.', 409),
	riotRateLimited: (retryAfterSeconds: number) =>
		new AppError(
			'RIOT_RATE_LIMITED',
			`Trop de requêtes vers Riot, réessaie dans ${retryAfterSeconds} s.`,
			429,
			retryAfterSeconds
		),
	riotApiKeyInvalid: () =>
		new AppError(
			'RIOT_API_KEY_INVALID',
			'Clé API Riot invalide ou expirée : régénère-la sur developer.riotgames.com.',
			503
		),
	riotUnavailable: () =>
		new AppError(
			'RIOT_UNAVAILABLE',
			'Le service Riot est momentanément indisponible, réessaie plus tard.',
			503
		),
	internal: () => new AppError('INTERNAL_ERROR', 'Une erreur inattendue est survenue.', 500)
};

export function toAppError(err: unknown): AppError {
	return err instanceof AppError ? err : errors.internal();
}

export function toErrorResponse(err: unknown): Response {
	const appError = toAppError(err);
	const headers: Record<string, string> = {};
	if (appError.retryAfterSeconds !== undefined) {
		headers['Retry-After'] = String(appError.retryAfterSeconds);
	}
	return Response.json({ error: appError.toApiError() }, { status: appError.status, headers });
}
