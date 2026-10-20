import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { allPuuids, hiddenParticipant, liveGame } from '../../../tests/fixtures/app/live-game.ts';
import { ClientApiError } from '../client/api.ts';
import type { LiveGameResult, RankedStatsMap } from '../shared/types.ts';
import LiveGameSection from './LiveGameSection.svelte';

const BUTTON = { name: 'Actualiser la partie en cours' };

function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

function renderSection(loadLiveGame: () => Promise<LiveGameResult>) {
	return render(LiveGameSection, { loadLiveGame, platform: 'euw1', highlightPuuid: 'puuid-Moi' });
}

describe('LiveGameSection (US1)', () => {
	it('au montage : aucune vérification, seul le bouton est visible (FR-001)', async () => {
		const loadLiveGame = vi.fn();
		const screen = renderSection(loadLiveGame);
		await expect.element(screen.getByRole('button', BUTTON)).toBeEnabled();
		expect(loadLiveGame).not.toHaveBeenCalled();
		expect(screen.getByRole('region', { name: 'Partie en cours' }).elements()).toHaveLength(0);
	});

	it('pendant la vérification le bouton est inactif, puis la card s’affiche', async () => {
		const pending = deferred<LiveGameResult>();
		const screen = renderSection(() => pending.promise);
		await screen.getByRole('button', BUTTON).click();
		await expect.element(screen.getByRole('button', BUTTON)).toBeDisabled();
		pending.resolve({ state: 'in-game', game: liveGame() });
		await expect.element(screen.getByRole('region', { name: 'Partie en cours' })).toBeVisible();
		await expect.element(screen.getByRole('button', BUTTON)).toBeEnabled();
	});

	it('hors partie : « Pas de partie classée Solo/Duo en cours »', async () => {
		const screen = renderSection(async () => ({ state: 'not-in-game' }));
		await screen.getByRole('button', BUTTON).click();
		await expect
			.element(screen.getByText('Pas de partie classée Solo/Duo en cours'))
			.toBeInTheDocument();
	});

	it('autre mode : « En partie (ARAM), pas en classée Solo/Duo »', async () => {
		const screen = renderSection(async () => ({ state: 'other-mode', queueLabel: 'ARAM' }));
		await screen.getByRole('button', BUTTON).click();
		await expect
			.element(screen.getByText('En partie (ARAM), pas en classée Solo/Duo'))
			.toBeInTheDocument();
	});

	it('erreur : message clair', async () => {
		const screen = renderSection(async () => {
			throw new ClientApiError(
				{ code: 'RIOT_UNAVAILABLE', message: 'Le service Riot est momentanément indisponible.' },
				503
			);
		});
		await screen.getByRole('button', BUTTON).click();
		await expect.element(screen.getByRole('alert')).toHaveTextContent('momentanément indisponible');
	});

	it('un nouveau clic garde la card visible pendant la vérification', async () => {
		const results = [deferred<LiveGameResult>(), deferred<LiveGameResult>()];
		let call = 0;
		const screen = renderSection(() => results[call++].promise);
		await screen.getByRole('button', BUTTON).click();
		results[0].resolve({ state: 'in-game', game: liveGame() });
		await expect.element(screen.getByRole('region', { name: 'Partie en cours' })).toBeVisible();

		await screen.getByRole('button', BUTTON).click();
		await expect.element(screen.getByRole('button', BUTTON)).toBeDisabled();
		await expect.element(screen.getByRole('region', { name: 'Partie en cours' })).toBeVisible();
		results[1].resolve({ state: 'not-in-game' });
		await expect
			.element(screen.getByText('Pas de partie classée Solo/Duo en cours'))
			.toBeInTheDocument();
		expect(screen.getByRole('region', { name: 'Partie en cours' }).elements()).toHaveLength(0);
	});
});

describe('LiveGameSection (US2 : badges)', () => {
	it('charge les badges une fois, avec les 10 joueurs, après la card', async () => {
		const game = liveGame();
		const loadCounts = vi.fn(async () => ({ 'puuid-Adv1': 2 }));
		const screen = render(LiveGameSection, {
			loadLiveGame: async () => ({ state: 'in-game', game }),
			loadCounts,
			platform: 'euw1',
			highlightPuuid: 'puuid-Moi'
		});
		await screen.getByRole('button', BUTTON).click();
		await expect.element(screen.getByLabelText('2 parties ensemble')).toBeInTheDocument();
		expect(loadCounts).toHaveBeenCalledTimes(1);
		expect(loadCounts).toHaveBeenCalledWith(allPuuids(game));
	});

	it('si les badges échouent : aucun badge et aucune erreur affichée', async () => {
		const screen = render(LiveGameSection, {
			loadLiveGame: async () => ({ state: 'in-game', game: liveGame() }),
			loadCounts: async () => {
				throw new Error('pas d’analyse');
			},
			platform: 'euw1',
			highlightPuuid: 'puuid-Moi'
		});
		await screen.getByRole('button', BUTTON).click();
		await expect.element(screen.getByRole('region', { name: 'Partie en cours' })).toBeVisible();
		expect(screen.getByRole('alert').elements()).toHaveLength(0);
		expect(screen.getByText('👥', { exact: false }).elements()).toHaveLength(0);
	});
});

describe('LiveGameSection (US3 : statistiques après la composition)', () => {
	it('affiche la composition avant l’arrivée des statistiques, puis les complète', async () => {
		const game = liveGame();
		const stats = deferred<RankedStatsMap>();
		const loadRankedStats = vi.fn(() => stats.promise);
		const screen = render(LiveGameSection, {
			loadLiveGame: async () => ({ state: 'in-game', game }),
			loadRankedStats,
			platform: 'euw1',
			highlightPuuid: 'puuid-Moi'
		});
		await screen.getByRole('button', BUTTON).click();
		await expect.element(screen.getByText('Adv1#EUW')).toBeVisible();
		await expect.element(screen.getByText('Chargement du classement…').first()).toBeVisible();
		expect(loadRankedStats).toHaveBeenCalledWith(allPuuids(game));

		stats.resolve(Object.fromEntries(allPuuids(game).map((p) => [p, { status: 'unranked' }])));
		await expect.poll(() => screen.getByText('Non classé').elements().length).toBe(10);
	});

	it('si toutes les statistiques échouent : « Statistiques indisponibles » pour chacun', async () => {
		const screen = render(LiveGameSection, {
			loadLiveGame: async () => ({ state: 'in-game', game: liveGame() }),
			loadRankedStats: async () => {
				throw new Error('quota');
			},
			platform: 'euw1',
			highlightPuuid: 'puuid-Moi'
		});
		await screen.getByRole('button', BUTTON).click();
		await expect
			.poll(() => screen.getByText('Statistiques indisponibles').elements().length)
			.toBe(10);
	});
});

describe('LiveGameSection (joueur masqué, FR-006a)', () => {
	it('ne demande badges et statistiques que pour les joueurs non masqués', async () => {
		const game = liveGame();
		game.teams[1].participants[4] = hiddenParticipant('red');
		const loadCounts = vi.fn(async () => ({}));
		const loadRankedStats = vi.fn(async () => ({}));
		const screen = render(LiveGameSection, {
			loadLiveGame: async () => ({ state: 'in-game', game }),
			loadCounts,
			loadRankedStats,
			platform: 'euw1',
			highlightPuuid: 'puuid-Moi'
		});
		await screen.getByRole('button', BUTTON).click();
		await expect.element(screen.getByText('Joueur masqué')).toBeVisible();
		const expected = allPuuids(game);
		expect(expected).toHaveLength(9);
		expect(loadCounts).toHaveBeenCalledWith(expected);
		expect(loadRankedStats).toHaveBeenCalledWith(expected);
	});
});
