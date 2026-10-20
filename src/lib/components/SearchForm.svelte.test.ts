import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SearchForm from './SearchForm.svelte';

describe('SearchForm', () => {
	it('propose les 15 serveurs, EUW sélectionné par défaut', async () => {
		const screen = render(SearchForm, { onsearch: vi.fn() });
		const select = screen.getByLabelText('Serveur');
		await expect.element(select).toHaveValue('euw1');
		expect(screen.getByRole('option').elements()).toHaveLength(15);
	});

	it('refuse un Riot ID sans tag, sans lancer de recherche', async () => {
		const onsearch = vi.fn();
		const screen = render(SearchForm, { onsearch });
		await screen.getByLabelText('Riot ID').fill('Pseudo');
		await screen.getByRole('button', { name: 'Rechercher' }).click();
		await expect
			.element(screen.getByRole('alert'))
			.toHaveTextContent('Format attendu : Pseudo#TAG');
		expect(onsearch).not.toHaveBeenCalled();
	});

	it('lance la recherche avec le serveur et le Riot ID découpé', async () => {
		const onsearch = vi.fn();
		const screen = render(SearchForm, { onsearch });
		await screen.getByLabelText('Riot ID').fill('Faker#KR1');
		await screen.getByLabelText('Serveur').selectOptions('kr');
		await screen.getByRole('button', { name: 'Rechercher' }).click();
		expect(onsearch).toHaveBeenCalledWith('kr', { gameName: 'Faker', tagLine: 'KR1' });
	});

	it('peut être pré-rempli (page d’un joueur)', async () => {
		const screen = render(SearchForm, {
			onsearch: vi.fn(),
			initialRiotId: 'Moi#EUW',
			initialPlatform: 'eun1'
		});
		await expect.element(screen.getByLabelText('Riot ID')).toHaveValue('Moi#EUW');
		await expect.element(screen.getByLabelText('Serveur')).toHaveValue('eun1');
	});
});
