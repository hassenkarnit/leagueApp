# Data Model: Historique d'un joueur et « a-t-il déjà joué avec moi ? »

**Phase 1** — modèle des données manipulées par l'application. Les types TypeScript
correspondants vivent dans `src/lib/shared/types.ts` (partagés front/serveur) ; les schémas de
validation des réponses Riot dans `src/lib/server/riot/schemas.ts`.

Deux niveaux à distinguer :

1. **Données Riot brutes** (`AccountDto`, `SummonerDto`, `MatchDto`) : validées par zod à
   l'entrée, jamais renvoyées telles quelles au navigateur.
2. **Données de l'application** (ci-dessous) : simplifiées, en français côté libellés, seules à
   circuler dans notre API REST.

---

## Types de base

| Type | Définition | Règles |
|---|---|---|
| `Platform` | `'euw1' \| 'eun1' \| 'tr1' \| 'ru' \| 'me1' \| 'na1' \| 'br1' \| 'la1' \| 'la2' \| 'kr' \| 'jp1' \| 'oc1' \| 'sg2' \| 'tw2' \| 'vn2'` | Valeur par défaut : `euw1`. PH2/TH2 exclus (fusionnés) |
| `Puuid` | `string` | Identité **permanente** d'un joueur (78 caractères). Clé de toutes les comparaisons (FR-014) |
| `RiotId` | `{ gameName: string; tagLine: string }` | `gameName` : 3–16 caractères ; `tagLine` : 3–5 caractères alphanumériques ; espaces de début/fin retirés ; comparaison insensible à la casse ; pas de restriction ASCII |
| `MatchOutcome` | `'win' \| 'loss' \| 'remake'` | `remake` si `gameEndedInEarlySurrender` → jamais compté en victoire/défaite |
| `TeamSide` | `'blue' \| 'red'` | `teamId` 100 → `blue`, 200 → `red` |

**Format URL d'un Riot ID** : `{gameName}-{tagLine}`, découpé sur le **dernier** `-`
(un tag ne contient jamais de `-`), chaque partie encodée (`encodeURIComponent`).
Saisie utilisateur : `Pseudo#TAG`.

---

## PlayerProfile — *Joueur* (spec : Key Entities)

| Champ | Type | Source Riot |
|---|---|---|
| `puuid` | `Puuid` | account-v1 |
| `gameName`, `tagLine` | `string` | account-v1 (casse officielle) |
| `platform` | `Platform` | choisi par l'utilisateur |
| `profileIconUrl` | `string` | summoner-v4 `profileIconId` + Data Dragon |
| `summonerLevel` | `number` | summoner-v4 |

## MatchSummary — *Match* vu par un joueur (FR-005, FR-006)

| Champ | Type | Règle |
|---|---|---|
| `matchId` | `string` | ex. `EUW1_7212345678` |
| `queueLabel` | `string` | libellé français du mode (R13), repli sur la description Riot |
| `playedAt` | `string` (ISO 8601) | `gameStartTimestamp` (ms) |
| `durationSeconds` | `number` | `gameDuration` en s si `gameEndTimestamp` présent, sinon ms ÷ 1000 |
| `player` | `Participant` | la participation du joueur consulté |
| `outcome` | `MatchOutcome` | du point de vue du joueur consulté |
| `teams` | `{ side: TeamSide; outcome: MatchOutcome; participants: Participant[] }[2]` | 5 participants par équipe (FR-008) |

## Participant — *Participation*

| Champ | Type | Règle |
|---|---|---|
| `puuid` | `Puuid \| null` | `null` pour un bot |
| `gameName`, `tagLine` | `string \| null` | Riot ID **au moment de la partie** ; `null` pour un bot |
| `isBot` | `boolean` | `puuid === 'BOT'` ou `riotIdGameName` vide (défensif) |
| `championName` | `string` | |
| `championIconUrl` | `string` | Data Dragon |
| `side` | `TeamSide` | |
| `kills`, `deaths`, `assists` | `number` | KDA affiché `K / D / A` |

## ReferenceAccount — *Compte de référence (« moi »)* (FR-009)

Stocké **uniquement dans le navigateur** (`localStorage`, clé `leagueapp.reference`).

| Champ | Type |
|---|---|
| `puuid` | `Puuid` |
| `gameName`, `tagLine` | `string` |
| `platform` | `Platform` |

Défini en recherchant un Riot ID puis en le confirmant ; modifiable et effaçable (FR-009).

## Analysis — analyse des 100 dernières parties (FR-012, FR-012a, FR-012b)

Stockée côté serveur dans `data/analyses/{puuid}.json` via `AnalysisStore`.

| Champ | Type | Règle |
|---|---|---|
| `schemaVersion` | `1` | permet de faire évoluer le format du fichier |
| `puuid` | `Puuid` | compte de référence |
| `platform` | `Platform` | |
| `lastAnalyzedAt` | `string \| null` (ISO) | date de fin de la dernière analyse réussie (FR-012b) |
| `windowMatchIds` | `string[]` (≤ 100) | les 100 derniers IDs au moment de l'analyse (fenêtre) |
| `matches` | `Record<matchId, AnalyzedMatch>` | uniquement les matchs de la fenêtre effectivement récupérés |
| `unavailableMatchIds` | `string[]` | IDs de la fenêtre refusés par Riot (403/404) — non réessayés |

### AnalyzedMatch (forme compacte, ~1 Ko)

| Champ | Type |
|---|---|
| `matchId` | `string` |
| `playedAt` | `string` (ISO) |
| `queueId` | `number` |
| `referenceChampion` | `string` |
| `referenceSide` | `TeamSide` |
| `referenceOutcome` | `MatchOutcome` |
| `others` | `{ puuid: Puuid; gameName: string; tagLine: string; championName: string; side: TeamSide }[]` (≤ 9, bots exclus) |

**Règles** :
- Fenêtre glissante : à chaque analyse, les matchs sortis des 100 derniers IDs sont retirés.
- Un match déjà présent dans `matches` ou `unavailableMatchIds` n'est **jamais** redemandé à Riot.
- Sauvegarde tous les 10 matchs → reprise possible après interruption.
- « Période analysée » affichée = nombre de matchs dans `matches` + date du plus ancien.

### AnalysisStatus — état de l'analyse (en mémoire, renvoyé par l'API)

```text
           POST /analysis                    tous les IDs traités
  idle ───────────────────────► running ───────────────────────────► done
   ▲                              │  │                                  │
   │                              │  └── erreur bloquante (clé, Riot ──► failed
   │                              │       indisponible)                  │
   └──────────── nouvelle analyse (POST) ◄─────────────────────────────────┘
```

| Champ | Type | Règle |
|---|---|---|
| `state` | `'never' \| 'running' \| 'done' \| 'failed'` | `never` = aucun fichier pour ce PUUID |
| `processed`, `total` | `number` | progression « 37 / 100 » (FR-012a) |
| `lastAnalyzedAt` | `string \| null` | FR-012b |
| `analyzedCount` | `number` | matchs utilisables |
| `unavailableCount` | `number` | matchs refusés par Riot |
| `oldestMatchAt` | `string \| null` | début de la période analysée |
| `error` | `ApiError \| null` | si `failed` |

Une seule analyse `running` à la fois par PUUID (un second `POST` → 409).

## EncounterSummary — *Historique commun* (FR-010, FR-011, FR-013)

Calculé à la demande à partir de `Analysis` (fonction pure, aucun appel Riot).

| Champ | Type | Règle |
|---|---|---|
| `otherPuuid` | `Puuid` | |
| `isSelf` | `boolean` | `true` si `otherPuuid === puuid de référence` → « C'est vous » (FR-015) |
| `total` | `number` | nombre de matchs communs |
| `sameTeam` | `{ games; wins; losses; remakes }` | du point de vue du compte de référence |
| `opponents` | `{ games; wins; losses; remakes }` | idem |
| `lastPlayedAt` | `string \| null` | |
| `games` | `{ matchId; playedAt; queueLabel; relation: 'same-team' \| 'opponent'; referenceChampion; otherChampion; referenceOutcome }[]` | plus récent d'abord (FR-011) |
| `period` | `{ analyzedCount; oldestMatchAt }` | toujours renvoyée (FR-012, FR-013) |

**Invariants testables** (SC-004) : `total = sameTeam.games + opponents.games` ;
`games = wins + losses + remakes` dans chaque catégorie ; un match n'est compté qu'une fois.

## EncounterCounts — badges (FR-010a)

`Record<Puuid, number>` : pour une liste de PUUID demandés, nombre de matchs communs ; les
joueurs jamais croisés sont **absents** de l'objet (aucun badge).

## ApiError — format d'erreur unique de notre API (FR-018)

| Champ | Type |
|---|---|
| `code` | voir tableau |
| `message` | `string` — texte français prêt à afficher |
| `retryAfterSeconds` | `number?` |

| `code` | HTTP | Message utilisateur (indicatif) |
|---|---|---|
| `INVALID_RIOT_ID` | 400 | « Format attendu : Pseudo#TAG (3 à 16 caractères, puis 3 à 5 caractères après le #). » |
| `INVALID_PLATFORM` | 400 | « Serveur inconnu. » |
| `PLAYER_NOT_FOUND` | 404 | « Joueur introuvable. Vérifie le pseudo, le tag et le serveur. » |
| `REFERENCE_NOT_ANALYZED` | 404 | « Lance d'abord l'analyse de ton historique. » |
| `ANALYSIS_ALREADY_RUNNING` | 409 | « Une analyse est déjà en cours. » |
| `RIOT_RATE_LIMITED` | 429 | « Trop de requêtes vers Riot, réessaie dans N s. » |
| `RIOT_API_KEY_INVALID` | 503 | « Clé API Riot invalide ou expirée : régénère-la sur developer.riotgames.com. » |
| `RIOT_UNAVAILABLE` | 503 | « Le service Riot est momentanément indisponible, réessaie plus tard. » |
| `INTERNAL_ERROR` | 500 | « Une erreur inattendue est survenue. » |

La clé API n'apparaît **jamais** dans `message`, ni dans les logs (principe I).
