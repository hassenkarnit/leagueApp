// Appels typés vers NOTRE API REST (/api/...) — jamais directement vers Riot.
import type { ApiError } from '#lib/shared/types.ts';

export class ClientApiError extends Error {
	readonly apiError: ApiError;
	readonly status: number;

	constructor(apiError: ApiError, status: number) {
		super(apiError.message);
		this.name = 'ClientApiError';
		this.apiError = apiError;
		this.status = status;
	}
}

const UNREADABLE_ERROR: ApiError = {
	code: 'INTERNAL_ERROR',
	message: 'Une erreur inattendue est survenue.'
};

async function parse<T>(response: Response): Promise<T> {
	const body = await response.json().catch(() => undefined);
	if (response.ok) return body as T;
	const apiError = (body as { error?: ApiError } | undefined)?.error ?? UNREADABLE_ERROR;
	throw new ClientApiError(apiError, response.status);
}

/** `fetchFn` permet d'utiliser le `fetch` fourni par les fonctions `load` de SvelteKit. */
export async function apiGet<T>(path: string, fetchFn: typeof fetch = fetch): Promise<T> {
	return parse<T>(await fetchFn(path));
}

export async function apiPost<T>(
	path: string,
	body: unknown,
	fetchFn: typeof fetch = fetch
): Promise<T> {
	return parse<T>(
		await fetchFn(path, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	);
}

/** Convertit n'importe quelle erreur en ApiError affichable. */
export function toApiError(err: unknown): ApiError {
	return err instanceof ClientApiError ? err.apiError : UNREADABLE_ERROR;
}
