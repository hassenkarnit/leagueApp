---

description: "Task list for feature 002-live-game-card"
---

# Tasks: Card « Partie en cours » (classée Solo/Duo)

**Input**: Design documents from `specs/002-live-game-card/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.openapi.yaml, quickstart.md

**Tests**: **OBLIGATOIRES** (constitution, principe III) — chaque test est écrit et vu en échec avant
le code ; l'API Riot est simulée par MSW (spectator-v5, league-v4, champion.json).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Conventions

Identiques à la feature 001 (`specs/001-historique-joueur/tasks.md`) : imports `#lib/...` avec
extension, `Response.json`, runes Svelte 5, tests serveur `*.test.ts` (Node + MSW), tests composants
`*.svelte.test.ts` (navigateur), erreurs `{ error: ApiError }`, Tailwind `zinc` + une couleur d'accent.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Vérifier la base : branche `002-live-game-card`, `npm run test` / `check` / `lint` au vert avant tout changement
- [X] T002 [P] Créer les fixtures dans `tests/fixtures/riot/` : `active-game-ranked.json` (`gameQueueConfigId: 420`, `gameStartTime` > 0, 10 participants `teamId` 100/200 avec `puuid`, `riotId` « Pseudo#TAG », `championId`, `bot: false` ; bleus : `puuid-reference` « Moi#EUW », `puuid-friend` « Ami#EUW1 », 3 autres ; rouges : 5 joueurs dont un `championId` absent de champion.json), `active-game-aram.json` (`gameQueueConfigId: 450`), `active-game-loading.json` (`gameQueueConfigId: 420`, `gameStartTime: 0`), `league-entries-ranked.json` (Solo/Duo PLATINUM II 45 LP 120 V / 102 D + Flex), `league-entries-flex-only.json`, `champion.json` (extrait Data Dragon : `data.{Id}.key` numérique en chaîne → `id`)
- [X] T003 Étendre `tests/msw/handlers.ts` : `GET https://*.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/:puuid` (`puuid-reference` → partie classée, sinon 404 `{"httpStatus":404,"errorCode":"NOT_FOUND"}`), `GET …/lol/league/v4/entries/by-puuid/:puuid` (`puuid-reference` → classé, `puuid-friend` → Flex seulement, sinon `[]`), `GET https://ddragon.leagueoflegends.com/cdn/:version/data/en_US/champion.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests (écrire d'abord, vérifier qu'ils ÉCHOUENT)

- [X] T004 [P] Tests client Riot dans `src/lib/server/riot/client.test.ts` : `getActiveGame` → partie validée (hôte **plateforme**, ex. `euw1.api.riotgames.com`) ; 404 → `null` (pas `PLAYER_NOT_FOUND`) ; 401 → `RIOT_API_KEY_INVALID` ; `getLeagueEntries` → entrées validées (hôte plateforme)
- [X] T005 [P] Tests dans `src/lib/server/static-data.test.ts` : `getChampion(103)` → `{ name: 'Ahri', iconUrl: '…/cdn/16.20.1/img/champion/Ahri.png' }` ; id inconnu → `{ name: 'Champion 9999', iconUrl: null }` ; champion.json mis en cache 6 h
- [X] T006 [P] Tests dans `src/lib/shared/ranked.test.ts` : `winRate(120, 102)` = 54 (« round(wins / (wins + losses) × 100) ») ; `formatRank` → « Platine II · 45 LP », « Challenger · 2256 LP » (division masquée pour MASTER / GRANDMASTER / CHALLENGER) ; `formatRecord` → « 54 % · 120 V / 102 D » ; libellés des 10 paliers (research.md R3)

### Implementation

- [X] T007 [P] Ajouter à `src/lib/shared/types.ts` : `LiveGameResult` (`in-game` | `other-mode` | `not-in-game`), `LiveGame` (`startedAt: string | null`), `LiveTeam`, `LiveParticipant` (`championIconUrl: string | null`), `RankedStats` (`ranked` | `unranked` | `unavailable`), `RankedStatsMap`, `PlayerRef` (`puuid`, `gameName`, `tagLine`)
- [X] T008 [P] Ajouter `ActiveGameDto` et `LeagueEntryDto` (champs de data-model.md) dans `src/lib/server/riot/schemas.ts`
- [X] T009 Ajouter `getActiveGame` (404 → `null`) et `getLeagueEntries` dans `src/lib/server/riot/client.ts` (fait passer T004)
- [X] T010 [P] Ajouter `getChampion(championId)` dans `src/lib/server/static-data.ts` (fait passer T005)
- [X] T011 [P] Créer `src/lib/shared/ranked.ts` (fait passer T006)
- [X] T012 Élargir `participant` de `src/lib/components/EncounterPanel.svelte` au type `PlayerRef` (ses tests existants doivent rester verts)

**Checkpoint**: fondations prêtes.

---

## Phase 3: User Story 1 - Afficher la partie classée Solo/Duo en cours (Priority: P1) 🎯 MVP

**Goal**: Bouton « Actualiser la partie en cours » → card des deux équipes (Riot ID, champion, durée) pour une Solo/Duo, sinon message.

**Independent Test**: quickstart scénarios 1 à 5, 12 et 14.

### Tests (écrire d'abord, vérifier qu'ils ÉCHOUENT)

- [X] T013 [P] [US1] Tests du service dans `src/lib/server/live-game.test.ts` : partie Solo/Duo → `in-game`, `queueLabel` « Classée Solo/Duo », équipes `blue` puis `red` de 5, `riotId` découpé, champion inconnu → `Champion {id}` + icône `null` ; ARAM → `other-mode` « ARAM » ; 404 → `not-in-game` ; `gameStartTime: 0` → `startedAt: null` ; deux appels → deux requêtes spectator (**jamais de cache**, FR-001)
- [X] T014 [P] [US1] Tests de route dans `src/routes/api/players/[platform]/[riotId]/live-game/server.test.ts` : 200 conforme au contrat pour les 3 états ; 400 `INVALID_RIOT_ID` / `INVALID_PLATFORM` ; 404 `PLAYER_NOT_FOUND` (Riot ID inexistant)
- [X] T015 [P] [US1] Test composant `src/lib/components/LiveGameCard.svelte.test.ts` : « Classée Solo/Duo », 2 équipes de 5 visibles **sans interaction**, Riot ID et champion par joueur, joueur consulté mis en évidence (`aria-current`), durée `mm:ss` qui avance (horloge injectée), « Écran de chargement » si `startedAt` null, aucun sort / rune / bannissement
- [X] T016 [P] [US1] Test composant `src/lib/components/LiveGameSection.svelte.test.ts` : au montage **aucun appel** et seul le bouton est visible ; clic → bouton inactif pendant la vérification ; `in-game` → card ; `not-in-game` → « Pas de partie classée Solo/Duo en cours » ; `other-mode` → « En partie (ARAM), pas en classée Solo/Duo » ; erreur → `ErrorMessage` ; nouveau clic depuis la card → la card reste visible pendant la vérification

### Implementation

- [X] T017 [US1] Créer `src/lib/server/live-game.ts` : `createLiveGameService({ riot, staticData })` avec `getLiveGame(platform, puuid)` (fait passer T013)
- [X] T018 [US1] Ajouter `getPuuid(platform, riotId)` (compte en cache) au service `src/lib/server/players.ts` et l'instance `liveGame` dans `src/lib/server/services.ts` (+ `tests/helpers/services.ts`)
- [X] T019 [US1] Créer `src/routes/api/players/[platform]/[riotId]/live-game/+server.ts` (fait passer T014)
- [X] T020 [P] [US1] Ajouter `getLiveGame(apiBase)` dans `src/lib/client/endpoints.ts`
- [X] T021 [P] [US1] Créer `src/lib/components/LiveTeamColumn.svelte` (une ligne par joueur : icône + nom du champion, Riot ID ; joueur consulté mis en évidence)
- [X] T022 [US1] Créer `src/lib/components/LiveGameCard.svelte` (en-tête « Partie en cours · Classée Solo/Duo · durée », deux `LiveTeamColumn` côte à côte) (fait passer T015)
- [X] T023 [US1] Créer `src/lib/components/LiveGameSection.svelte` (bouton, états idle / checking / card / message / erreur) (fait passer T016)
- [X] T024 [US1] Intégrer `LiveGameSection` sous `PlayerHeader`, au-dessus de l'historique, dans `src/routes/joueur/[platform]/[riotId]/+page.svelte` (nouvelle section à chaque joueur)
- [ ] T025 [US1] Valider manuellement les scénarios 1 à 5, 12 et 14 de `specs/002-live-game-card/quickstart.md`

**Checkpoint**: US1 fonctionnelle = MVP de la feature.

---

## Phase 4: User Story 2 - Repérer les joueurs déjà croisés dans la partie (Priority: P2)

**Goal**: Badges `👥 N`, clic → panneau « parties communes », lien ↗, « C'est vous ».

**Independent Test**: quickstart scénarios 8 à 10.

### Tests (écrire d'abord, vérifier qu'ils ÉCHOUENT)

- [X] T026 [P] [US2] Tests dans `src/lib/components/LiveGameCard.svelte.test.ts` : badge `👥 N` uniquement sur les joueurs présents dans `counts` ; clic sur un Riot ID → `onselect` avec ce joueur ; lien « Voir le profil de X » vers `/joueur/{platform}/{gameName}-{tagLine}?from=match` ; « C'est vous » sur `selfPuuid`
- [X] T027 [P] [US2] Test dans `src/lib/components/LiveGameSection.svelte.test.ts` : après une card, `loadCounts` est appelé une fois avec les 10 PUUID ; un échec de `loadCounts` n'affiche aucun badge et aucune erreur

### Implementation

- [X] T028 [US2] Ajouter badges, Riot ID cliquable, lien ↗ et « C'est vous » dans `src/lib/components/LiveTeamColumn.svelte` / `LiveGameCard.svelte` (fait passer T026)
- [X] T029 [US2] Appeler `loadCounts` après une card dans `src/lib/components/LiveGameSection.svelte` et brancher `loadCounts`, `onselect` (panneau existant) et `selfPuuid` dans `src/routes/joueur/[platform]/[riotId]/+page.svelte` (fait passer T027)
- [ ] T030 [US2] Valider manuellement les scénarios 8 à 10 de `specs/002-live-game-card/quickstart.md`

---

## Phase 5: User Story 3 - Niveau des joueurs en classée Solo/Duo (Priority: P3)

**Goal**: Rang actuel, % de victoires, V/D par joueur ; chargés après la composition ; cache 10 min.

**Independent Test**: quickstart scénarios 6, 7 et 11.

### Tests (écrire d'abord, vérifier qu'ils ÉCHOUENT)

- [X] T031 [P] [US3] Tests du service dans `src/lib/server/live-game.test.ts` : `getRankedStats` → `ranked` (`tierLabel` « Platine », `division` « II », `winRate` 54) pour `puuid-reference`, `unranked` pour Flex seulement et pour une liste vide ; un joueur en erreur → `unavailable` sans bloquer les autres ; 2e appel dans les 10 min → aucune requête league (cache, FR-016) ; un `unavailable` n'est **jamais** mis en cache
- [X] T032 [P] [US3] Tests de route dans `src/routes/api/ranked/[platform]/server.test.ts` : 200 `{ stats }` ; 400 `INVALID_REQUEST` pour 0 ou plus de 10 PUUID ; 400 `INVALID_PLATFORM`
- [X] T033 [P] [US3] Tests composants : `LiveGameCard.svelte.test.ts` (« Platine II · 45 LP », « 54 % · 120 V / 102 D », « Non classé », « Statistiques indisponibles », indicateur pendant le chargement) et `LiveGameSection.svelte.test.ts` (la composition s'affiche **avant** la résolution de `loadRankedStats` ; échec global → « Statistiques indisponibles » pour tous)

### Implementation

- [X] T034 [US3] Ajouter `getRankedStats(platform, puuids)` (cache 10 min par PUUID) dans `src/lib/server/live-game.ts` (fait passer T031)
- [X] T035 [US3] Créer `src/routes/api/ranked/[platform]/+server.ts` (fait passer T032)
- [X] T036 [P] [US3] Ajouter `getRankedStats(platform, puuids)` dans `src/lib/client/endpoints.ts`
- [X] T037 [US3] Afficher rang et statistiques dans `src/lib/components/LiveTeamColumn.svelte`, les charger après la composition dans `src/lib/components/LiveGameSection.svelte` et brancher `loadRankedStats` dans la page joueur (fait passer T033)
- [ ] T038 [US3] Valider manuellement les scénarios 6, 7 et 11 de `specs/002-live-game-card/quickstart.md`

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T039 [P] Vérifier qu'aucun secret ne fuit : `npm run build` puis aucune trace de clé dans `build/` ; aucun appel navigateur vers `*.api.riotgames.com`
- [X] T040 [P] Accessibilité de la card dans `src/lib/components/Live*.svelte` : contrastes ≥ 4,5:1, boutons au clavier, `aria-busy` pendant la vérification, durée lisible par les lecteurs d'écran
- [X] T041 [P] Mettre à jour `README.md` (fonctionnalité « Partie en cours »)
- [X] T042 Quality gates : `npm run test`, `npm run check`, `npm run lint` ; chaque FR-001 à FR-016 couverte par au moins un test
- [ ] T043 Dérouler les 14 scénarios de `specs/002-live-game-card/quickstart.md`

---

## Dependencies & Execution Order

- **Setup → Foundational** : bloquant pour toutes les stories.
- **US1** dépend de la Phase 2. **US2** et **US3** dépendent de US1 (elles enrichissent la card).
- **Polish** après les stories.

```text
Setup ──► Foundational ──► US1 (MVP) ──► US2
                                   └───► US3 ──► Polish
```

### Parallel Opportunities

- Phase 1 : T002 ; Phase 2 : tests T004–T006, puis T007, T008, T010, T011.
- US1 : tests T013–T016 ; T020 et T021.
- US2 : T026 et T027. US3 : T031–T033 ; T036.

## Implementation Strategy

1. Setup + Foundational → 2. US1 → **valider** (MVP : la card s'affiche) → 3. US2 (badges) →
4. US3 (rang et %) → 5. Polish → Pull Request `002-live-game-card` → `main` (après fusion de la PR #1).

## Notes

- [P] = fichiers différents, aucune dépendance sur une tâche non terminée.
- Vérifier que les tests échouent **avant** d'implémenter ; cocher chaque tâche dès qu'elle est finie.
- Aucune requête de partie en cours ne doit partir sans clic (FR-001).
