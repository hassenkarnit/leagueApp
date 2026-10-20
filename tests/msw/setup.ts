// Chargé avant chaque fichier de test du projet Vitest « server ».
// Toute requête réseau non simulée fait échouer le test (principe III : aucun appel réel à Riot).
import { afterAll, afterEach, beforeAll } from 'vitest';
import { recordedRiotRequests } from './handlers.ts';
import { server } from './server.ts';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
	server.resetHandlers();
	recordedRiotRequests.length = 0;
});

afterAll(() => server.close());
