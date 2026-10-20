import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { ClientApiError } from '../client/api.ts';
import { ReferenceStore } from '../client/reference.svelte.ts';
import type { PlayerProfile } from '../shared/types.ts';
import ReferenceAccount from './ReferenceAccount.svelte';

const PROFILE: PlayerProfile = {
	puuid: 'puuid-reference',
	gameName: 'Moi',
	tagLine: 'EUW',
	platform: 'euw1',
	profileIconUrl: 'https://example.test/icon.png',
	summonerLevel: 312
};

const noStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

describe('ReferenceAccount', () => {
	it('sans référence : propose de saisir son Riot ID et son serveur', async () => {
		const screen = render(ReferenceAccount, {
			store: new ReferenceStore(noStorage),
			lookup: vi.fn()
		});
		await expect.element(screen.getByLabelText('Mon Riot ID')).toBeInTheDocument();
		await expect.element(screen.getByLabelText('Serveur de mon compte')).toHaveValue('euw1');
	});

	it('enregistre le compte trouvé (avec son PUUID)', async () => {
		const store = new ReferenceStore(noStorage);
		const lookup = vi.fn(async () => PROFILE);
		const screen = render(ReferenceAccount, { store, lookup });
		await screen.getByLabelText('Mon Riot ID').fill('moi#euw');
		await screen.getByRole('button', { name: 'Enregistrer' }).click();
		expect(lookup).toHaveBeenCalledWith('euw1', { gameName: 'moi', tagLine: 'euw' });
		await expect.element(screen.getByText('Moi#EUW')).toBeInTheDocument();
		expect(store.current).toEqual({
			puuid: 'puuid-reference',
			gameName: 'Moi',
			tagLine: 'EUW',
			platform: 'euw1'
		});
	});

	it('Riot ID introuvable : message d’erreur et rien n’est enregistré', async () => {
		const store = new ReferenceStore(noStorage);
		const lookup = vi.fn(async () => {
			throw new ClientApiError(
				{
					code: 'PLAYER_NOT_FOUND',
					message: 'Joueur introuvable. Vérifie le pseudo, le tag et le serveur.'
				},
				404
			);
		});
		const screen = render(ReferenceAccount, { store, lookup });
		await screen.getByLabelText('Mon Riot ID').fill('Faute#EUW');
		await screen.getByRole('button', { name: 'Enregistrer' }).click();
		await expect.element(screen.getByRole('alert')).toHaveTextContent('Joueur introuvable');
		expect(store.current).toBeNull();
	});

	it('avec référence : affiche le compte, « Modifier » et « Effacer »', async () => {
		const store = new ReferenceStore(noStorage);
		store.set({ puuid: 'puuid-reference', gameName: 'Moi', tagLine: 'EUW', platform: 'euw1' });
		const screen = render(ReferenceAccount, { store, lookup: vi.fn() });
		await expect.element(screen.getByText('Moi#EUW')).toBeInTheDocument();

		await screen.getByRole('button', { name: 'Modifier' }).click();
		await expect.element(screen.getByLabelText('Mon Riot ID')).toHaveValue('Moi#EUW');
		await screen.getByRole('button', { name: 'Annuler' }).click();

		await screen.getByRole('button', { name: 'Effacer' }).click();
		expect(store.current).toBeNull();
		await expect.element(screen.getByLabelText('Mon Riot ID')).toBeInTheDocument();
	});
});
