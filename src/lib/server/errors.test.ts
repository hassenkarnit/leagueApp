import { describe, expect, it } from 'vitest';
import type { ApiErrorCode } from '#lib/shared/types.ts';
import { AppError, errors, toErrorResponse } from './errors.ts';

describe('toErrorResponse', () => {
	it.each<[AppError, ApiErrorCode, number]>([
		[errors.invalidRiotId(), 'INVALID_RIOT_ID', 400],
		[errors.invalidPlatform(), 'INVALID_PLATFORM', 400],
		[errors.invalidRequest(), 'INVALID_REQUEST', 400],
		[errors.playerNotFound(), 'PLAYER_NOT_FOUND', 404],
		[errors.referenceNotAnalyzed(), 'REFERENCE_NOT_ANALYZED', 404],
		[errors.analysisAlreadyRunning(), 'ANALYSIS_ALREADY_RUNNING', 409],
		[errors.riotRateLimited(5), 'RIOT_RATE_LIMITED', 429],
		[errors.riotApiKeyInvalid(), 'RIOT_API_KEY_INVALID', 503],
		[errors.riotUnavailable(), 'RIOT_UNAVAILABLE', 503],
		[errors.internal(), 'INTERNAL_ERROR', 500]
	])('%s → %s (%i)', async (error, code, status) => {
		const response = toErrorResponse(error);
		expect(response.status).toBe(status);
		const body = await response.json();
		expect(body.error.code).toBe(code);
		expect(typeof body.error.message).toBe('string');
		expect(body.error.message.length).toBeGreaterThan(0);
	});

	it('ajoute retryAfterSeconds et l’en-tête Retry-After pour RIOT_RATE_LIMITED', async () => {
		const response = toErrorResponse(errors.riotRateLimited(7));
		expect(response.headers.get('Retry-After')).toBe('7');
		const body = await response.json();
		expect(body.error.retryAfterSeconds).toBe(7);
		expect(body.error.message).toContain('7');
	});

	it('transforme une erreur inconnue en INTERNAL_ERROR sans détail technique', async () => {
		const response = toErrorResponse(new TypeError('cannot read properties of undefined (x.y)'));
		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.error.code).toBe('INTERNAL_ERROR');
		expect(body.error.message).not.toContain('undefined');
	});

	it('écrit des messages en français prêts à afficher', () => {
		expect(errors.playerNotFound().message).toBe(
			'Joueur introuvable. Vérifie le pseudo, le tag et le serveur.'
		);
		expect(errors.riotApiKeyInvalid().message).toContain('developer.riotgames.com');
	});
});
