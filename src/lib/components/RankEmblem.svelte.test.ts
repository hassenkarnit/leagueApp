import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RankEmblem from './RankEmblem.svelte';

describe('RankEmblem', () => {
	it("affiche l'emblème du palier avec un texte alternatif", async () => {
		const screen = render(RankEmblem, { tier: 'GOLD', label: 'Or' });
		const img = screen.getByAltText('Or');
		await expect.element(img).toHaveAttribute('src', '/ranks/gold.png');
	});

	it('affiche un emblème neutre « Sans rang » sans palier', async () => {
		const screen = render(RankEmblem, { tier: null });
		await expect.element(screen.getByRole('img', { name: 'Sans rang' })).toBeVisible();
		expect(screen.container.querySelector('img')).toBeNull();
	});

	it("masque l'image si elle ne se charge pas (FR-004)", async () => {
		const screen = render(RankEmblem, { tier: 'GOLD', label: 'Or' });
		const img = screen.container.querySelector('img') as HTMLImageElement;
		img.dispatchEvent(new Event('error'));
		await expect.poll(() => screen.container.querySelector('img')).toBeNull();
	});
});
