import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { botMatchSummary, matchSummary } from '../../../tests/fixtures/app/match-summaries.ts';
import MatchRow from './MatchRow.svelte';

describe('MatchRow', () => {
	it('résume le match : champion, résultat, KDA, mode, date et durée', async () => {
		const match = matchSummary();
		const screen = render(MatchRow, { match });
		await expect.element(screen.getByAltText('Ahri')).toBeInTheDocument();
		await expect.element(screen.getByText('Victoire')).toBeInTheDocument();
		await expect.element(screen.getByText('3 / 2 / 5')).toBeInTheDocument();
		await expect.element(screen.getByText('Classée Solo/Duo')).toBeInTheDocument();
		await expect.element(screen.getByText('30:20')).toBeInTheDocument();
		const time = screen.container.querySelector('time');
		expect(time?.getAttribute('datetime')).toBe(match.playedAt);
	});

	it.each([
		['loss', 'Défaite'],
		['remake', 'Partie annulée']
	] as const)('affiche le résultat « %s »', async (outcome, label) => {
		const screen = render(MatchRow, { match: matchSummary({ outcome }) });
		await expect.element(screen.getByText(label)).toBeInTheDocument();
	});

	it('est replié par défaut puis montre les deux équipes de 5', async () => {
		const screen = render(MatchRow, { match: matchSummary() });
		const toggle = screen.getByRole('button', { name: /participants/i });
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(screen.getByText('Joueur5#EUW').elements()).toHaveLength(0);

		await toggle.click();
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect.element(screen.getByText('Joueur5#EUW')).toBeInTheDocument();
		expect(screen.getByRole('listitem').elements()).toHaveLength(10);
		await expect.element(screen.getByText('Équipe bleue')).toBeInTheDocument();
		await expect.element(screen.getByText('Équipe rouge')).toBeInTheDocument();
	});

	it('affiche les bots comme « Bot »', async () => {
		const screen = render(MatchRow, { match: botMatchSummary() });
		await screen.getByRole('button', { name: /participants/i }).click();
		expect(screen.getByText('Bot', { exact: true }).elements()).toHaveLength(5);
	});
});
