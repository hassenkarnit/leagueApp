import type { ComponentProps } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { participant } from '../../../tests/fixtures/app/match-summaries.ts';
import { ClientApiError } from '../client/api.ts';
import type { EncounterSummary, ReferenceAccount } from '../shared/types.ts';
import EncounterPanel from './EncounterPanel.svelte';

const ME: ReferenceAccount = {
	puuid: 'puuid-Moi',
	gameName: 'Moi',
	tagLine: 'EUW',
	platform: 'euw1'
};
const FRIEND = participant('Ami', 'red', 'Lux');
const NOW = Date.parse('2026-10-20T12:00:00.000Z');

function summary(overrides: Partial<EncounterSummary> = {}): EncounterSummary {
	return {
		otherPuuid: 'puuid-Ami',
		isSelf: false,
		total: 3,
		sameTeam: { games: 2, wins: 1, losses: 0, remakes: 1 },
		opponents: { games: 1, wins: 0, losses: 1, remakes: 0 },
		lastPlayedAt: '2026-10-18T12:00:00.000Z',
		games: [
			{
				matchId: 'EUW1_1',
				playedAt: '2026-10-18T12:00:00.000Z',
				queueLabel: 'Classée Solo/Duo',
				relation: 'same-team',
				referenceChampion: 'Ahri',
				otherChampion: 'Lux',
				referenceOutcome: 'win'
			}
		],
		period: { analyzedCount: 98, oldestMatchAt: '2026-08-01T10:00:00.000Z' },
		...overrides
	};
}

function renderPanel(props: Partial<ComponentProps<typeof EncounterPanel>>) {
	return render(EncounterPanel, {
		reference: ME,
		participant: FRIEND,
		load: vi.fn(async () => summary()),
		onclose: vi.fn(),
		now: () => NOW,
		...props
	});
}

describe('EncounterPanel', () => {
	it('affiche le résumé des parties communes', async () => {
		const screen = renderPanel({});
		const panel = screen.getByRole('dialog', { name: 'Ami#EUW' });
		await expect.element(panel).toHaveTextContent('3 parties ensemble');
		await expect
			.element(panel)
			.toHaveTextContent('Même équipe : 2 (1 victoire, 0 défaite, 1 annulée)');
		await expect.element(panel).toHaveTextContent('Adversaires : 1 (0 victoire, 1 défaite)');
		await expect.element(panel).toHaveTextContent('Dernière partie : il y a 2 jours');
	});

	it('déplie la liste détaillée des parties', async () => {
		const screen = renderPanel({});
		await screen.getByText('Voir les parties').click();
		await expect.element(screen.getByText(/Ahri vs Lux|Ahri avec Lux/)).toBeInTheDocument();
		await expect.element(screen.getByText('Classée Solo/Duo')).toBeInTheDocument();
	});

	it('« Jamais joué ensemble » avec la période analysée (FR-013)', async () => {
		const load = vi.fn(async () =>
			summary({
				total: 0,
				games: [],
				lastPlayedAt: null,
				sameTeam: { games: 0, wins: 0, losses: 0, remakes: 0 },
				opponents: { games: 0, wins: 0, losses: 0, remakes: 0 }
			})
		);
		const screen = renderPanel({ load });
		await expect
			.element(screen.getByRole('dialog'))
			.toHaveTextContent(
				'Jamais joué ensemble sur tes 98 dernières parties (depuis le 01/08/2026)'
			);
	});

	it('« C’est vous » sans appel à l’API (FR-015)', async () => {
		const load = vi.fn();
		const screen = renderPanel({ load, participant: participant('Moi', 'blue') });
		await expect.element(screen.getByRole('dialog')).toHaveTextContent("C'est vous");
		expect(load).not.toHaveBeenCalled();
	});

	it('sans compte de référence : invite à le définir (FR-016)', async () => {
		const load = vi.fn();
		const screen = renderPanel({ load, reference: null });
		await expect.element(screen.getByRole('dialog')).toHaveTextContent('Indique ton Riot ID');
		expect(load).not.toHaveBeenCalled();
	});

	it('sans analyse : invite à la lancer (FR-016)', async () => {
		const load = vi.fn(async () => {
			throw new ClientApiError(
				{ code: 'REFERENCE_NOT_ANALYZED', message: "Lance d'abord l'analyse de ton historique." },
				404
			);
		});
		const screen = renderPanel({ load });
		await expect
			.element(screen.getByRole('dialog'))
			.toHaveTextContent("Lance d'abord l'analyse de ton historique.");
	});

	it('se ferme avec le bouton ou la touche Échap', async () => {
		const onclose = vi.fn();
		const screen = renderPanel({ onclose });
		await screen.getByRole('button', { name: 'Fermer' }).click();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(onclose).toHaveBeenCalledTimes(2);
	});
});
