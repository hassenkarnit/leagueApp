import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { participant } from '../../../tests/fixtures/app/match-summaries.ts';
import type { Team } from '../shared/types.ts';
import TeamTable from './TeamTable.svelte';

const team: Team = {
	side: 'red',
	outcome: 'loss',
	participants: [
		participant('Joueur5', 'red'),
		participant('Le Joueur', 'red'),
		participant(null, 'red'),
		participant(null, 'red'),
		participant(null, 'red')
	]
};

describe('TeamTable — « Voir le profil » (US3)', () => {
	it('propose un lien vers le profil de chaque joueur humain', async () => {
		const screen = render(TeamTable, { team, platform: 'euw1' });
		const link = screen.getByRole('link', { name: 'Voir le profil de Joueur5#EUW' });
		await expect.element(link).toHaveAttribute('href', '/joueur/euw1/Joueur5-EUW?from=match');
	});

	it('encode le Riot ID dans le lien', async () => {
		const screen = render(TeamTable, { team, platform: 'euw1' });
		const link = screen.getByRole('link', { name: 'Voir le profil de Le Joueur#EUW' });
		await expect.element(link).toHaveAttribute('href', '/joueur/euw1/Le%20Joueur-EUW?from=match');
	});

	it('n’affiche aucun lien pour les bots', async () => {
		const screen = render(TeamTable, { team, platform: 'euw1' });
		expect(screen.getByRole('link').elements()).toHaveLength(2);
	});

	it('n’affiche aucun lien si le serveur du match est inconnu', async () => {
		const screen = render(TeamTable, { team, platform: null });
		expect(screen.getByRole('link').elements()).toHaveLength(0);
	});
});
