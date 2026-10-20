import { describe, expect, it } from 'vitest';
import { AppError } from '../errors.ts';
import { regionsFor } from './routing.ts';

describe('regionsFor (table R7 de research.md)', () => {
	it.each(['euw1', 'eun1', 'tr1', 'ru', 'me1'])('%s → europe', (platform) => {
		expect(regionsFor(platform)).toEqual({ match: 'europe', account: 'europe' });
	});

	it.each(['na1', 'br1', 'la1', 'la2'])('%s → americas', (platform) => {
		expect(regionsFor(platform)).toEqual({ match: 'americas', account: 'americas' });
	});

	it.each(['kr', 'jp1'])('%s → asia', (platform) => {
		expect(regionsFor(platform)).toEqual({ match: 'asia', account: 'asia' });
	});

	it.each(['oc1', 'sg2', 'tw2', 'vn2'])('%s → match sea, account asia', (platform) => {
		expect(regionsFor(platform)).toEqual({ match: 'sea', account: 'asia' });
	});

	it.each(['ph2', 'th2', 'xx', ''])('refuse la plateforme inconnue « %s »', (platform) => {
		try {
			regionsFor(platform);
			expect.unreachable();
		} catch (err) {
			expect(err).toBeInstanceOf(AppError);
			expect((err as AppError).code).toBe('INVALID_PLATFORM');
		}
	});
});
