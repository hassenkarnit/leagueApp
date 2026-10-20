import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ErrorMessage from './ErrorMessage.svelte';

describe('ErrorMessage', () => {
	it('affiche le message dans une alerte', async () => {
		const screen = render(ErrorMessage, {
			error: {
				code: 'PLAYER_NOT_FOUND',
				message: 'Joueur introuvable. Vérifie le pseudo, le tag et le serveur.'
			}
		});
		await expect
			.element(screen.getByRole('alert'))
			.toHaveTextContent('Joueur introuvable. Vérifie le pseudo, le tag et le serveur.');
	});

	it('mentionne le délai avant un nouvel essai', async () => {
		const screen = render(ErrorMessage, {
			error: {
				code: 'RIOT_RATE_LIMITED',
				message: 'Trop de requêtes vers Riot.',
				retryAfterSeconds: 12
			}
		});
		await expect.element(screen.getByRole('alert')).toHaveTextContent('12 s');
	});
});
