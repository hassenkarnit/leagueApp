import { describe, expect, it } from 'vitest';
import { platformFromMatchId } from './platforms.ts';

describe('platformFromMatchId', () => {
	it.each([
		['EUW1_7212345678', 'euw1'],
		['OC1_123', 'oc1'],
		['KR_8000000000', 'kr'],
		['SG2_42', 'sg2']
	])('%s → %s', (matchId, platform) => {
		expect(platformFromMatchId(matchId)).toBe(platform);
	});

	it.each(['PH2_1', 'XX_1', 'sans-underscore', ''])('préfixe inconnu « %s » → null', (matchId) => {
		expect(platformFromMatchId(matchId)).toBeNull();
	});
});
