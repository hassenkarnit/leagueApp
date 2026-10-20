// Instances partagées par les routes de l'API (un seul limiteur et un seul cache pour toute l'app).
import { getRiotApiKey } from './config.ts';
import { createPlayersService } from './players.ts';
import { createRiotClient } from './riot/client.ts';
import { createLimiterRegistry } from './riot/rate-limiter.ts';
import { createStaticData } from './static-data.ts';

export const riotClient = createRiotClient({
	apiKey: getRiotApiKey,
	limiterFor: createLimiterRegistry()
});

export const staticData = createStaticData();

export const players = createPlayersService({ riot: riotClient, staticData });
