import type { HandleServerError } from '@sveltejs/kit/hooks';

// Erreurs imprévues : journalisées côté serveur (sans en-têtes ni secret), message générique
// côté utilisateur. Les erreurs prévues de l'API passent par `toErrorResponse` et n'arrivent pas ici.
export const handleError: HandleServerError = ({ kind, error, event }) => {
	if (kind !== 'unknown') return;
	console.error(
		`[serveur] Erreur inattendue sur ${event.request.method} ${event.url.pathname}`,
		error
	);
	return { message: 'Une erreur inattendue est survenue.' };
};
