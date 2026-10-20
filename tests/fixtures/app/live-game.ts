// Données d'exemple au format de NOTRE API (LiveGame), pour les tests de composants.
import type { LiveGame, LiveParticipant, TeamSide } from '../../../src/lib/shared/types.ts';

const ICON = 'https://ddragon.leagueoflegends.com/cdn/16.20.1/img/champion';

export function liveParticipant(
	name: string,
	side: TeamSide,
	championName = 'Garen'
): LiveParticipant {
	return {
		puuid: `puuid-${name}`,
		isHidden: false,
		gameName: name,
		tagLine: 'EUW',
		championName,
		championIconUrl: `${ICON}/${championName}.png`,
		side
	};
}

export function liveGame(overrides: Partial<LiveGame> = {}): LiveGame {
	return {
		gameId: 7300000001,
		queueLabel: 'Classée Solo/Duo',
		startedAt: '2026-10-20T12:00:00.000Z',
		teams: [
			{
				side: 'blue',
				participants: [
					liveParticipant('Moi', 'blue', 'Ahri'),
					liveParticipant('Ami', 'blue', 'Lux'),
					liveParticipant('Allié1', 'blue'),
					liveParticipant('Allié2', 'blue'),
					liveParticipant('Allié3', 'blue')
				]
			},
			{
				side: 'red',
				participants: [
					liveParticipant('Adv1', 'red', 'Zed'),
					liveParticipant('Adv2', 'red'),
					liveParticipant('Adv3', 'red'),
					liveParticipant('Adv4', 'red'),
					liveParticipant('Adv5', 'red')
				]
			}
		],
		...overrides
	};
}

/** Joueur masqué par Riot : pas de PUUID, Riot ID remplacé par le champion (FR-006a). */
export function hiddenParticipant(side: TeamSide, championName = 'Corki'): LiveParticipant {
	return {
		puuid: null,
		isHidden: true,
		gameName: '',
		tagLine: '',
		championName,
		championIconUrl: `${ICON}/${championName}.png`,
		side
	};
}

/** PUUID des joueurs non masqués (ceux pour qui on demande badges et statistiques). */
export const allPuuids = (game: LiveGame) =>
	game.teams.flatMap((t) => t.participants.flatMap((p) => (p.puuid ? [p.puuid] : [])));
