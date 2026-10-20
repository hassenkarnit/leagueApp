// Remplace `#lib/server/services.ts` dans les tests de routes :
// fausse clé, stockage en mémoire (jamais d'écriture dans data/), Riot simulé par MSW.
import { createAnalyzer } from '../../src/lib/server/analysis/analyzer.ts';
import { InMemoryAnalysisStore } from '../../src/lib/server/analysis/store.ts';
import { createPlayersService } from '../../src/lib/server/players.ts';
import { createRiotClient } from '../../src/lib/server/riot/client.ts';
import { createLimiterRegistry } from '../../src/lib/server/riot/rate-limiter.ts';
import { createStaticData } from '../../src/lib/server/static-data.ts';

export function createTestServices() {
	const riotClient = createRiotClient({
		apiKey: () => 'RGAPI-test',
		limiterFor: createLimiterRegistry(),
		logger: { warn: () => {} }
	});
	const staticData = createStaticData();
	const analysisStore = new InMemoryAnalysisStore();
	return {
		riotClient,
		staticData,
		analysisStore,
		players: createPlayersService({ riot: riotClient, staticData }),
		analyzer: createAnalyzer({ riot: riotClient, store: analysisStore })
	};
}
