import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { matchPage } from '../../../tests/fixtures/app/match-summaries.ts';
import type { MatchPage } from '../shared/types.ts';
import { ClientApiError } from '../client/api.ts';
import MatchList from './MatchList.svelte';

describe('MatchList', () => {
	it('affiche « Aucune partie récente » quand la liste est vide', async () => {
		const screen = render(MatchList, { initialPage: matchPage(0), loadPage: vi.fn() });
		await expect.element(screen.getByText('Aucune partie récente')).toBeInTheDocument();
	});

	it('affiche « Plus de matchs » seulement s’il reste des matchs', async () => {
		const screen = render(MatchList, { initialPage: matchPage(3), loadPage: vi.fn() });
		expect(screen.getByRole('button', { name: 'Plus de matchs' }).elements()).toHaveLength(0);
	});

	it('ajoute la page suivante à la fin de la liste', async () => {
		const loadPage = vi.fn(async () => matchPage(2, 20));
		const screen = render(MatchList, { initialPage: matchPage(20, 0, true), loadPage });
		await screen.getByRole('button', { name: 'Plus de matchs' }).click();
		expect(loadPage).toHaveBeenCalledWith(20);
		await expect.poll(() => screen.getByRole('article').elements().length).toBe(22);
	});

	it('montre un indicateur pendant le chargement', async () => {
		let finish: (page: MatchPage) => void = () => {};
		const loadPage = vi.fn(() => new Promise<MatchPage>((resolve) => (finish = resolve)));
		const screen = render(MatchList, { initialPage: matchPage(20, 0, true), loadPage });
		await screen.getByRole('button', { name: 'Plus de matchs' }).click();
		await expect.element(screen.getByRole('status')).toHaveTextContent('Chargement');
		finish(matchPage(1, 20));
		await expect.poll(() => screen.getByRole('status').elements().length).toBe(0);
	});

	it('sauvegarde puis restaure les pages chargées et les matchs dépliés (retour arrière, US3)', async () => {
		const loadPage = vi.fn(async () => matchPage(2, 20));
		const first = render(MatchList, { initialPage: matchPage(20, 0, true), loadPage });
		await first.getByRole('button', { name: 'Plus de matchs' }).click();
		await expect.poll(() => first.getByRole('article').elements().length).toBe(22);
		await first.getByRole('button', { name: 'Voir les participants' }).first().click();
		const saved = first.component.capture();
		expect(JSON.parse(JSON.stringify(saved))).toEqual(saved); // sérialisable (sessionStorage)
		await first.unmount();

		const second = render(MatchList, { initialPage: matchPage(20, 0, true), loadPage });
		second.component.restore(saved);
		await expect.poll(() => second.getByRole('article').elements().length).toBe(22);
		expect(
			second.getByRole('button', { name: 'Masquer les participants' }).elements()
		).toHaveLength(1);
		expect(loadPage).toHaveBeenCalledTimes(1); // aucune page rechargée
	});

	it('garde les matchs affichés et montre l’erreur si la page suivante échoue', async () => {
		const loadPage = vi.fn(async () => {
			throw new ClientApiError(
				{ code: 'RIOT_RATE_LIMITED', message: 'Trop de requêtes vers Riot.', retryAfterSeconds: 3 },
				429
			);
		});
		const screen = render(MatchList, { initialPage: matchPage(20, 0, true), loadPage });
		await screen.getByRole('button', { name: 'Plus de matchs' }).click();
		await expect
			.element(screen.getByRole('alert'))
			.toHaveTextContent('Trop de requêtes vers Riot.');
		expect(screen.getByRole('article').elements()).toHaveLength(20);
	});
});
