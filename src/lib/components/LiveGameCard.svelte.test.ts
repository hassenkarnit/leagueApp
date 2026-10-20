import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { hiddenParticipant, liveGame } from '../../../tests/fixtures/app/live-game.ts';
import LiveGameCard from './LiveGameCard.svelte';

const START = Date.parse('2026-10-20T12:00:00.000Z');

describe('LiveGameCard (US1)', () => {
	it('affiche « Classée Solo/Duo » et les deux équipes de 5 sans interaction', async () => {
		const screen = render(LiveGameCard, {
			game: liveGame(),
			platform: 'euw1',
			highlightPuuid: 'puuid-Ami',
			now: () => START
		});
		const card = screen.getByRole('region', { name: 'Partie en cours' });
		await expect.element(card).toHaveTextContent('Classée Solo/Duo');
		await expect.element(screen.getByText('Équipe bleue')).toBeVisible();
		await expect.element(screen.getByText('Équipe rouge')).toBeVisible();
		expect(screen.getByRole('listitem').elements()).toHaveLength(10);
		await expect.element(screen.getByText('Adv1#EUW')).toBeVisible();
		await expect.element(screen.getByAltText('Zed')).toBeVisible();
		expect(screen.getByRole('button', { name: /déplier|participants/i }).elements()).toHaveLength(
			0
		);
	});

	it('met en évidence le joueur consulté (aria-current)', async () => {
		const screen = render(LiveGameCard, {
			game: liveGame(),
			platform: 'euw1',
			highlightPuuid: 'puuid-Ami',
			now: () => START
		});
		const highlighted = screen.container.querySelectorAll('[aria-current="true"]');
		expect(highlighted).toHaveLength(1);
		expect(highlighted[0].textContent).toContain('Ami#EUW');
	});

	it('fait avancer la durée toute seule', async () => {
		let now = START + 125_000;
		const screen = render(LiveGameCard, {
			game: liveGame(),
			platform: 'euw1',
			highlightPuuid: 'puuid-Moi',
			now: () => now,
			tickMs: 20
		});
		await expect.element(screen.getByText('2:05')).toBeInTheDocument();
		now += 60_000;
		await expect.element(screen.getByText('3:05')).toBeInTheDocument();
	});

	it('affiche « Écran de chargement » tant que la partie n’a pas démarré', async () => {
		const screen = render(LiveGameCard, {
			game: liveGame({ startedAt: null }),
			platform: 'euw1',
			highlightPuuid: 'puuid-Moi',
			now: () => START
		});
		await expect.element(screen.getByText('Écran de chargement')).toBeInTheDocument();
	});

	it('n’affiche ni bannissements, ni sorts, ni runes (FR-006)', async () => {
		const screen = render(LiveGameCard, {
			game: liveGame(),
			platform: 'euw1',
			highlightPuuid: 'puuid-Moi',
			now: () => START
		});
		const text = screen.container.textContent ?? '';
		expect(text).not.toMatch(/bann|sort|rune/i);
	});
});

describe('LiveGameCard (US2 : joueurs déjà croisés)', () => {
	function renderCard(overrides: Record<string, unknown> = {}) {
		return render(LiveGameCard, {
			game: liveGame(),
			platform: 'euw1',
			highlightPuuid: 'puuid-Ami',
			selfPuuid: 'puuid-Moi',
			counts: { 'puuid-Adv1': 3 },
			onselect: vi.fn(),
			now: () => START,
			...overrides
		});
	}

	it('affiche le badge 👥 uniquement sur les joueurs déjà croisés', async () => {
		const screen = renderCard();
		await expect.element(screen.getByLabelText('3 parties ensemble')).toBeInTheDocument();
		expect(screen.getByText('👥', { exact: false }).elements()).toHaveLength(1);
	});

	it('signale le clic sur un Riot ID', async () => {
		const onselect = vi.fn();
		const screen = renderCard({ onselect });
		await screen.getByRole('button', { name: 'Adv1#EUW' }).click();
		expect(onselect).toHaveBeenCalledWith(expect.objectContaining({ puuid: 'puuid-Adv1' }));
	});

	it('propose « Voir le profil » vers la page du joueur', async () => {
		const screen = renderCard();
		await expect
			.element(screen.getByRole('link', { name: 'Voir le profil de Adv1#EUW' }))
			.toHaveAttribute('href', '/joueur/euw1/Adv1-EUW?from=match');
	});

	it('indique « C’est vous » sur le compte de référence', async () => {
		const screen = renderCard();
		const self = screen.container.querySelector('[data-puuid="puuid-Moi"]');
		expect(self?.textContent).toContain("C'est vous");
		expect(screen.getByText("C'est vous").elements()).toHaveLength(1);
	});
});

describe('LiveGameCard (US3 : niveau Solo/Duo)', () => {
	const stats = {
		'puuid-Moi': {
			status: 'ranked' as const,
			tier: 'PLATINUM',
			tierLabel: 'Platine',
			division: 'II',
			leaguePoints: 45,
			wins: 120,
			losses: 102,
			winRate: 54
		},
		'puuid-Ami': { status: 'unranked' as const },
		'puuid-Adv1': { status: 'unavailable' as const }
	};

	it('affiche rang, % de victoires, « Non classé » et « Statistiques indisponibles »', async () => {
		const screen = render(LiveGameCard, {
			game: liveGame(),
			platform: 'euw1',
			highlightPuuid: 'puuid-Moi',
			stats,
			now: () => START
		});
		const row = (puuid: string) =>
			screen.container.querySelector(`[data-puuid="${puuid}"]`)?.textContent ?? '';
		expect(row('puuid-Moi')).toContain('Platine II · 45 LP');
		expect(row('puuid-Moi')).toContain('54 % · 120 V / 102 D');
		expect(row('puuid-Ami')).toContain('Non classé');
		expect(row('puuid-Adv1')).toContain('Statistiques indisponibles');
	});

	it('indique le chargement tant que les statistiques ne sont pas arrivées', async () => {
		const screen = render(LiveGameCard, {
			game: liveGame(),
			platform: 'euw1',
			highlightPuuid: 'puuid-Moi',
			stats: null,
			now: () => START
		});
		expect(screen.getByText('Chargement du classement…').elements()).toHaveLength(10);
	});
});

describe('LiveGameCard (joueur masqué par Riot, FR-006a)', () => {
	it('affiche « Joueur masqué » avec son champion, sans badge, lien, clic ni statistiques', async () => {
		const game = liveGame();
		game.teams[1].participants[4] = hiddenParticipant('red', 'Corki');
		const screen = render(LiveGameCard, {
			game,
			platform: 'euw1',
			highlightPuuid: 'puuid-Moi',
			counts: {},
			stats: {},
			onselect: vi.fn(),
			now: () => START
		});
		const hiddenRow = screen.getByText('Joueur masqué');
		await expect.element(hiddenRow).toBeVisible();
		await expect.element(screen.getByAltText('Corki')).toBeVisible();
		expect(screen.getByRole('link').elements()).toHaveLength(9);
		expect(screen.getByRole('button').elements()).toHaveLength(9);
		expect(screen.getByText('Statistiques indisponibles').elements()).toHaveLength(9);
	});
});
