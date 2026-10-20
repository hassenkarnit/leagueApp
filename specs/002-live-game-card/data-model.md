# Data Model: Card « Partie en cours » (classée Solo/Duo)

**Phase 1**. Types ajoutés à `src/lib/shared/types.ts` ; schémas zod des réponses Riot dans
`src/lib/server/riot/schemas.ts`. Les types de la feature 001 (`Platform`, `Puuid`, `TeamSide`,
`ApiError`, `EncounterCounts`…) sont réutilisés sans changement
([../001-historique-joueur/data-model.md](../001-historique-joueur/data-model.md)).

---

## Données Riot brutes (validées par zod, jamais renvoyées au navigateur)

| DTO | Champs utilisés | Règles |
|---|---|---|
| `ActiveGameDto` | `gameId`, `gameQueueConfigId`, `gameStartTime` (ms), `participants[]` | autres champs ignorés |
| `ActiveParticipantDto` | `puuid`, `riotId` (`"Pseudo#TAG"`), `championId` (nombre), `teamId` (100/200), `bot` | `riotId` découpé sur le **dernier** `#` |
| `LeagueEntryDto` | `queueType`, `tier`, `rank`, `leaguePoints`, `wins`, `losses` | seule `RANKED_SOLO_5x5` est retenue |

## LiveGameResult — résultat d'une vérification (FR-001 à FR-003)

Union discriminée par `state` :

| `state` | Champs | Affichage |
|---|---|---|
| `in-game` | `game: LiveGame` | la card (Solo/Duo uniquement) |
| `other-mode` | `queueLabel: string` | « En partie ({queueLabel}), pas en classée Solo/Duo » |
| `not-in-game` | — | « Pas de partie classée Solo/Duo en cours » |

**Règle** : `in-game` si et seulement si `gameQueueConfigId === 420`.

## LiveGame — la partie en cours

| Champ | Type | Règle |
|---|---|---|
| `gameId` | `number` | |
| `queueLabel` | `string` | « Classée Solo/Duo » |
| `startedAt` | `string \| null` (ISO) | `null` si `gameStartTime <= 0` → « Écran de chargement » (FR-004) |
| `teams` | `[LiveTeam, LiveTeam]` | `blue` (100) puis `red` (200), 5 joueurs chacune |

## LiveTeam / LiveParticipant

| Champ | Type | Règle |
|---|---|---|
| `LiveTeam.side` | `TeamSide` | |
| `LiveTeam.participants` | `LiveParticipant[]` | ordre fourni par Riot |
| `LiveParticipant.puuid` | `Puuid` | identité permanente (badges, panneau, statistiques) |
| `LiveParticipant.gameName`, `tagLine` | `string` | issus de `riotId` |
| `LiveParticipant.championName` | `string` | `id` Data Dragon (ex. `Zac`) ; inconnu → `Champion {championId}` |
| `LiveParticipant.championIconUrl` | `string \| null` | `null` si champion inconnu |
| `LiveParticipant.side` | `TeamSide` | |

## RankedStats — niveau Solo/Duo d'un joueur (FR-012 à FR-015)

Union discriminée par `status`, une entrée par PUUID demandé :

| `status` | Champs | Affichage |
|---|---|---|
| `ranked` | `tier`, `tierLabel`, `division: string \| null`, `leaguePoints`, `wins`, `losses`, `winRate` | « Platine II · 45 LP » puis « 54 % · 120 V / 102 D » |
| `unranked` | — | « Non classé » |
| `unavailable` | — | « Statistiques indisponibles » |

**Règles** :
- `winRate = round(wins / (wins + losses) × 100)` (SC-006) ; `wins + losses = 0` → `unranked`.
- `division = null` pour MASTER, GRANDMASTER, CHALLENGER (affichage « Challenger · 2256 LP »).
- Libellés de paliers : voir research.md R3.
- Cache serveur 10 min par PUUID (FR-016) ; `unavailable` n'est **jamais** mis en cache.

`RankedStatsMap = Record<Puuid, RankedStats>`.

## État d'interface de la section « Partie en cours » (navigateur)

```text
          clic                       réponse in-game
 idle ─────────► checking ─────────────────────────────► showing-card ──┐
  ▲                 │  réponse not-in-game / other-mode                  │ clic
  │                 ├──────────────────────────────────► showing-message │
  │                 │  erreur                                            │
  │                 └──────────────────────────────────► showing-error   │
  └──────────────────── (nouveau joueur affiché) ◄──── checking ◄────────┘
```

- `idle` : seul le bouton est visible (FR-001 : aucune vérification automatique).
- Pendant `checking` le bouton est inactif ; un clic depuis `showing-card` garde la card visible
  jusqu'à la réponse (pas de clignotement).

## Erreurs

Aucun nouveau code `ApiError`. Les routes réutilisent `INVALID_RIOT_ID`, `INVALID_PLATFORM`,
`INVALID_REQUEST`, `PLAYER_NOT_FOUND`, `RIOT_RATE_LIMITED`, `RIOT_API_KEY_INVALID`,
`RIOT_UNAVAILABLE` (feature 001). Le 404 de spectator n'est **pas** une erreur (→ `not-in-game`).
