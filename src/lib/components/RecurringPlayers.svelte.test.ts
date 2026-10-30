import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { ClientApiError } from '../client/api.ts';
import type { RecurringPlayer, ReferenceAccount } from '../shared/types.ts';
import RecurringPlayers from './RecurringPlayers.svelte';

const ME: ReferenceAccount = {
	puuid: 'puuid-Moi',
	gameName: 'Moi',
	tagLine: 'EUW',
	platform: 'euw1'
};
const AMI: RecurringPlayer = {
	puuid: 'puuid-Ami',
	gameName: 'Ami',
	tagLine: 'EUW',
	total: 3,
	sameTeam: 2,
	opponents: 1,
	lastPlayedAt: '2026-10-19T12:00:00.000Z'
};

describe('RecurringPlayers', () => {
	it('affiche chaque joueur avec ses parties avec / contre moi et un lien vers sa page', async () => {
		const screen = render(RecurringPlayers, { reference: ME, load: async () => [AMI] });
		const link = screen.getByRole('link', { name: /Ami/ });
		await expect.element(link).toHaveTextContent('3 parties');
		await expect.element(link).toHaveTextContent('2 avec moi');
		await expect.element(link).toHaveTextContent('1 contre moi');
		await expect.element(link).toHaveAttribute('href', '/joueur/euw1/Ami-EUW');
	});

	it('sans analyse : message neutre, pas d’erreur', async () => {
		const screen = render(RecurringPlayers, {
			reference: ME,
			load: async () => {
				throw new ClientApiError({ code: 'REFERENCE_NOT_ANALYZED', message: 'x' }, 404);
			}
		});
		await expect
			.element(screen.getByText("Aucun joueur croisé plus d'une fois pour l'instant."))
			.toBeInTheDocument();
	});
});
