import { describe, expect, it } from 'vitest';
import { formatRiotId, parseRiotIdInput, parseUrlSegment, toUrlSegment } from './riot-id.ts';

describe('parseRiotIdInput (saisie « Pseudo#TAG »)', () => {
	it('découpe un Riot ID valide', () => {
		expect(parseRiotIdInput('Faker#KR1')).toEqual({
			ok: true,
			value: { gameName: 'Faker', tagLine: 'KR1' }
		});
	});

	it('retire les espaces de début et de fin', () => {
		expect(parseRiotIdInput('  Faker # KR1  ')).toEqual({
			ok: true,
			value: { gameName: 'Faker', tagLine: 'KR1' }
		});
	});

	it('accepte les espaces internes et les caractères non ASCII', () => {
		expect(parseRiotIdInput('Le Joueur#EUW')).toMatchObject({ ok: true });
		expect(parseRiotIdInput('제우스#KR1')).toMatchObject({ ok: true });
	});

	it.each([
		['sans #', 'Faker'],
		['tag vide', 'Faker#'],
		['pseudo vide', '#EUW'],
		['pseudo trop court (2)', 'ab#EUW'],
		['pseudo trop long (17)', 'abcdefghijklmnopq#EUW'],
		['tag trop court (2)', 'Faker#KR'],
		['tag trop long (6)', 'Faker#ABCDEF'],
		['tag non alphanumérique', 'Faker#K-R1']
	])('refuse un Riot ID invalide : %s', (_label, input) => {
		const result = parseRiotIdInput(input);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toContain('Pseudo#TAG');
	});
});

describe('format URL « gameName-tagLine »', () => {
	it('encode chaque partie', () => {
		expect(toUrlSegment({ gameName: 'Le Joueur', tagLine: 'EUW' })).toBe('Le%20Joueur-EUW');
	});

	it('découpe sur le dernier tiret (segment déjà décodé par SvelteKit)', () => {
		expect(parseUrlSegment('Jean-Pierre-EUW')).toEqual({
			ok: true,
			value: { gameName: 'Jean-Pierre', tagLine: 'EUW' }
		});
	});

	it('refuse un segment sans tiret', () => {
		expect(parseUrlSegment('FakerKR1').ok).toBe(false);
	});

	it('fait l’aller-retour avec toUrlSegment', () => {
		const id = { gameName: '제우스', tagLine: 'KR1' };
		expect(parseUrlSegment(decodeURIComponent(toUrlSegment(id)))).toEqual({ ok: true, value: id });
	});
});

describe('formatRiotId', () => {
	it('affiche « gameName#tagLine »', () => {
		expect(formatRiotId({ gameName: 'Faker', tagLine: 'KR1' })).toBe('Faker#KR1');
	});
});
