import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { AnalysisStatus, ReferenceAccount } from '../shared/types.ts';
import AnalysisControl from './AnalysisControl.svelte';

const ME: ReferenceAccount = {
	puuid: 'puuid-reference',
	gameName: 'Moi',
	tagLine: 'EUW',
	platform: 'euw1'
};
const NOW = Date.parse('2026-10-20T12:00:00.000Z');

function status(overrides: Partial<AnalysisStatus> = {}): AnalysisStatus {
	return {
		state: 'never',
		processed: 0,
		total: 0,
		lastAnalyzedAt: null,
		analyzedCount: 0,
		unavailableCount: 0,
		oldestMatchAt: null,
		error: null,
		...overrides
	};
}

describe('AnalysisControl', () => {
	it('lance l’analyse automatiquement au chargement', async () => {
		const done = status({ state: 'done', lastAnalyzedAt: '2026-10-18T12:00:00.000Z' });
		const api = { getStatus: vi.fn(async () => done), start: vi.fn(async () => done) };
		const screen = render(AnalysisControl, { reference: ME, api, now: () => NOW });
		await expect.poll(() => api.start).toHaveBeenCalledWith('puuid-reference', 'euw1');
		await expect
			.element(screen.getByRole('button', { name: 'Analyser mon historique' }))
			.toBeEnabled();
	});

	it('affiche la progression et désactive le bouton pendant l’analyse', async () => {
		const running = status({ state: 'running', processed: 37, total: 100 });
		const api = { getStatus: vi.fn(async () => running), start: vi.fn() };
		const screen = render(AnalysisControl, {
			reference: ME,
			api,
			now: () => NOW,
			pollIntervalMs: 10
		});
		await expect.element(screen.getByText('37 / 100 parties analysées')).toBeInTheDocument();
		await expect.element(screen.getByRole('button', { name: /Analyse en cours/ })).toBeDisabled();
		expect(api.start).not.toHaveBeenCalled();
	});

	it('interroge l’état jusqu’à la fin, puis permet de relancer au clic', async () => {
		const states = [
			status({ state: 'running', processed: 1, total: 4 }),
			status({
				state: 'done',
				processed: 4,
				total: 4,
				lastAnalyzedAt: '2026-10-20T11:59:50.000Z',
				analyzedCount: 4
			})
		];
		const api = {
			getStatus: vi.fn(async () => (states.length > 1 ? states.shift()! : states[0])),
			start: vi.fn(async () => status({ state: 'running', processed: 0, total: 4 }))
		};
		const screen = render(AnalysisControl, {
			reference: ME,
			api,
			now: () => NOW,
			pollIntervalMs: 10
		});
		await expect.element(screen.getByText(/Dernière analyse : à l'instant/)).toBeInTheDocument();
		await screen.getByRole('button', { name: 'Analyser mon historique' }).click();
		expect(api.start).toHaveBeenCalledWith('puuid-reference', 'euw1');
	});

	it('affiche la date de la dernière analyse (FR-012b)', async () => {
		const done = status({
			state: 'done',
			lastAnalyzedAt: '2026-10-18T12:00:00.000Z',
			analyzedCount: 98
		});
		const api = { getStatus: vi.fn(async () => done), start: vi.fn(async () => done) };
		const screen = render(AnalysisControl, { reference: ME, api, now: () => NOW });
		await expect.element(screen.getByText(/Dernière analyse : il y a 2 jours/)).toBeInTheDocument();
	});

	it('affiche l’erreur si l’analyse a échoué', async () => {
		const failed = status({
			state: 'failed',
			error: { code: 'RIOT_API_KEY_INVALID', message: 'Clé API Riot invalide ou expirée.' }
		});
		const api = { getStatus: vi.fn(async () => failed), start: vi.fn() };
		const screen = render(AnalysisControl, { reference: ME, api, now: () => NOW });
		await expect.element(screen.getByRole('alert')).toHaveTextContent('Clé API Riot invalide');
		expect(api.start).not.toHaveBeenCalled();
	});
});
