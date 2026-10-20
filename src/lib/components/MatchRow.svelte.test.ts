import { describe, expect, it, vi } from 'vitest';
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

	it('au dépliage, charge les badges 👥 des joueurs humains et signale le clic (US2)', async () => {
		const loadCounts = vi.fn(async () => ({ 'puuid-Joueur5': 2 }));
		const onselect = vi.fn();
		const screen = render(MatchRow, { match: matchSummary(), loadCounts, onselect });
		await screen.getByRole('button', { name: /participants/i }).click();

		expect(loadCounts).toHaveBeenCalledTimes(1);
		const requested = (loadCounts.mock.calls[0] as unknown as [string[]])[0];
		expect(requested).toHaveLength(10);
		await expect.element(screen.getByLabelText('2 parties ensemble')).toBeInTheDocument();
		expect(screen.getByText('👥', { exact: false }).elements()).toHaveLength(1);

		await screen.getByRole('button', { name: 'Joueur5#EUW' }).click();
		expect(onselect).toHaveBeenCalledWith(expect.objectContaining({ puuid: 'puuid-Joueur5' }));
	});

	it('affiche les bots comme « Bot »', async () => {
		const screen = render(MatchRow, { match: botMatchSummary() });
		await screen.getByRole('button', { name: /participants/i }).click();
		expect(screen.getByText('Bot', { exact: true }).elements()).toHaveLength(5);
	});
});
