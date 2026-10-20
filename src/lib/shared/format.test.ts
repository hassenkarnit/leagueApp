import { describe, expect, it } from 'vitest';
import { formatDuration, formatKda, formatRelativeDate } from './format.ts';

describe('formatDuration', () => {
	it.each([
		[1820, '30:20'],
		[190, '3:10'],
		[59, '0:59'],
		[3725, '1:02:05']
	])('%i s → %s', (seconds, expected) => {
		expect(formatDuration(seconds)).toBe(expected);
	});
});

describe('formatKda', () => {
	it('affiche « K / D / A »', () => {
		expect(formatKda({ kills: 3, deaths: 2, assists: 5 })).toBe('3 / 2 / 5');
	});
});

describe('formatRelativeDate', () => {
	const now = new Date('2026-10-20T12:00:00Z').getTime();

	it.each([
		['2026-10-20T11:59:30Z', "à l'instant"],
		['2026-10-20T11:15:00Z', 'il y a 45 minutes'],
		['2026-10-20T09:00:00Z', 'il y a 3 heures'],
		['2026-10-18T12:00:00Z', 'il y a 2 jours'],
		['2026-08-20T12:00:00Z', 'il y a 2 mois']
	])('%s → %s', (iso, expected) => {
		expect(formatRelativeDate(iso, now)).toBe(expected);
	});
});
