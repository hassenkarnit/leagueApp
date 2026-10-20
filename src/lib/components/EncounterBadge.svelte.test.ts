import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EncounterBadge from './EncounterBadge.svelte';

describe('EncounterBadge', () => {
	it('affiche 👥 et le nombre de parties communes', async () => {
		const screen = render(EncounterBadge, { count: 3 });
		const badge = screen.getByLabelText('3 parties ensemble');
		await expect.element(badge).toHaveTextContent('👥 3');
	});

	it('accorde au singulier', async () => {
		const screen = render(EncounterBadge, { count: 1 });
		await expect.element(screen.getByLabelText('1 partie ensemble')).toBeInTheDocument();
	});

	it('n’affiche rien sans partie commune', async () => {
		const screen = render(EncounterBadge, { count: undefined });
		expect(screen.container.textContent?.trim()).toBe('');
	});
});
