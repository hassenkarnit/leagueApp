// Données d'exemple au format de NOTRE API (MatchSummary), pour les tests de composants.
import type {
	MatchOutcome,
	MatchSummary,
	Participant,
	Team,
	TeamSide
} from '../../../src/lib/shared/types.ts';

const ICON = 'https://ddragon.leagueoflegends.com/cdn/16.20.1/img/champion';

export function participant(
	name: string | null,
	side: TeamSide,
	championName = 'Garen',
	overrides: Partial<Participant> = {}
): Participant {
	const isBot = name === null;
	return {
		puuid: isBot ? null : `puuid-${name}`,
		gameName: name,
		tagLine: isBot ? null : 'EUW',
		isBot,
		championName,
		championIconUrl: `${ICON}/${championName}.png`,
		side,
		kills: 1,
		deaths: 1,
		assists: 1,
		...overrides
	};
}

function team(side: TeamSide, outcome: MatchOutcome, names: Array<string | null>): Team {
	return { side, outcome, participants: names.map((n) => participant(n, side)) };
}

export function matchSummary(overrides: Partial<MatchSummary> = {}): MatchSummary {
	const me = participant('Moi', 'blue', 'Ahri', { kills: 3, deaths: 2, assists: 5 });
	const blue = team('blue', 'win', ['Joueur1', 'Joueur2', 'Joueur3', 'Joueur4']);
	blue.participants.unshift(me);
	return {
		matchId: 'EUW1_1001',
		queueLabel: 'Classée Solo/Duo',
		playedAt: '2026-10-19T12:00:00.000Z',
		durationSeconds: 1820,
		player: me,
		outcome: 'win',
		teams: [blue, team('red', 'loss', ['Joueur5', 'Joueur6', 'Joueur7', 'Joueur8', 'Joueur9'])],
		...overrides
	};
}

export function botMatchSummary(): MatchSummary {
	const base = matchSummary({ matchId: 'EUW1_1004', queueLabel: 'Coop vs IA' });
	return { ...base, teams: [base.teams[0], team('red', 'loss', [null, null, null, null, null])] };
}

/** Page de `count` matchs aux identifiants uniques à partir de `offset`. */
export function matchPage(count: number, offset = 0, hasMore = false) {
	return {
		matches: Array.from({ length: count }, (_, i) =>
			matchSummary({ matchId: `EUW1_${2000 + offset + i}` })
		),
		hasMore,
		skipped: 0
	};
}
