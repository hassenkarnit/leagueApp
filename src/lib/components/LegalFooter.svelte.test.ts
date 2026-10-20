import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LegalFooter from './LegalFooter.svelte';

// Texte exact exigé par Riot (developer.riotgames.com/policies/general) — research.md R15.
const RIOT_LEGAL_TEXT =
	"LeagueApp isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games " +
	'or anyone officially involved in producing or managing Riot Games properties. Riot Games, and ' +
	'all associated properties are trademarks or registered trademarks of Riot Games, Inc.';

describe('LegalFooter', () => {
	it('affiche la mention légale exacte de Riot', async () => {
		const screen = render(LegalFooter);
		await expect.element(screen.getByRole('contentinfo')).toHaveTextContent(RIOT_LEGAL_TEXT);
	});

	it('en donne une traduction française', async () => {
		const screen = render(LegalFooter);
		await expect
			.element(screen.getByRole('contentinfo'))
			.toHaveTextContent("LeagueApp n'est ni approuvé ni soutenu par Riot Games");
	});
});
