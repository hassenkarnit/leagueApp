import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

// Variables d'environnement validées au démarrage de l'application.
// Privées par défaut : lisibles uniquement côté serveur via `$app/env/private`.
export const variables = defineEnvVars({
	RIOT_API_KEY: {
		description:
			'Clé API Riot (developer.riotgames.com), à mettre dans .env — expire toutes les 24 h',
		schema: z
			.string()
			.startsWith('RGAPI-', 'RIOT_API_KEY doit commencer par « RGAPI- » (voir .env.example)')
	}
});
