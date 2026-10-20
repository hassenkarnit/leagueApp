# Implementation Plan: Card « Partie en cours » (classée Solo/Duo)

**Branch**: `002-live-game-card` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-live-game-card/spec.md`

## Summary

Sur le profil d'un joueur, un bouton « Actualiser la partie en cours » interroge, à la demande,
l'API Riot de partie en cours. Pour une partie classée Solo/Duo, une grande card montre les deux
équipes complètes (Riot ID, champion), la durée qui défile, les badges `👥` de la feature 001, et
pour chaque joueur son rang actuel et son pourcentage de victoires Solo/Duo (chargés juste après la
composition). Pour un autre mode ou hors partie, un court message.

Approche : extension de l'application SvelteKit de la feature 001, sans nouvelle dépendance.
Deux méthodes ajoutées au client Riot unique (spectator-v5, league-v4), un service `live-game`,
deux routes REST internes (composition, puis statistiques avec cache 10 min), une section
d'interface sur la page joueur. Détails : [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js ≥ 22.17 (inchangé, feature 001)

**Primary Dependencies**: SvelteKit 3.1, Svelte 5.57, Tailwind CSS 4.3, zod 4 — **aucune nouvelle dépendance**

**Storage**: aucun nouveau stockage ; cache mémoire TTL (10 min) pour les statistiques classées

**Testing**: Vitest 4 (projets `server` + MSW et `client` navigateur), nouvelles fixtures spectator / league / champion.json

**Target Platform**: identique à la 001 (navigateur de bureau + serveur Node local)

**Project Type**: application web SvelteKit (projet unique, existant)

**Performance Goals**: résultat d'une vérification < 3 s (SC-001) ; statistiques des 10 joueurs < 5 s après la card (SC-002)

**Constraints**: clé de dev 100 req / 2 min → ~11 requêtes par card, 1 seule au 2e clic grâce au cache ; aucune requête automatique (FR-001)

**Scale/Scope**: 1 section de page, 4 composants, 2 routes, 1 service ; 1 utilisateur

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Avant Phase 0 | Après Phase 1 |
|---|---|---|---|
| **I. Secrets** | Nouveaux appels Riot uniquement via le client serveur existant (`X-Riot-Token`) ; le navigateur n'appelle que `/api/...` ; la recherche n'a jamais affiché la clé | ✅ | ✅ |
| **II. API Riot** | Aucune vérification automatique (au clic seulement) ; classement en cache 10 min ; requêtes en priorité `interactive` dans le limiteur existant ; 404 spectator traité comme un état normal ; champion.json via Data Dragon (hors quota) | ✅ | ✅ |
| **III. Tests d'abord** | Tests écrits avant le code pour chaque tâche ; MSW simule spectator, league et champion.json, y compris 404, 429, 5xx et statistiques indisponibles pour un seul joueur | ✅ | ✅ |
| **IV. Simplicité** | Aucune dépendance, aucun stockage, pas de rafraîchissement automatique ni de streaming ; réutilisation des badges, du panneau et du lien de la 001 | ✅ | ✅ |
| **V. Spec avant code** | Spec clarifiée et commitée (`93b8dd9`) sur la branche `002-live-game-card` | ✅ | ✅ |
| **VI. Typé, erreurs explicites** | Réponses Riot validées par zod ; états discriminés (`in-game` / `other-mode` / `not-in-game`, `ranked` / `unranked` / `unavailable`) ; messages français ; erreurs par joueur sans bloquer la card | ✅ | ✅ |
| **Contraintes Riot** | Routage plateforme (spectator et league sont sur l'hôte plateforme) ; 401/403 = clé invalide (comportement existant) ; mention légale déjà présente | ✅ | ✅ |

**Résultat** : GATE franchi, aucune violation, aucune complexité à justifier.

## Project Structure

### Documentation (this feature)

```text
specs/002-live-game-card/
├── spec.md
├── plan.md              # Ce fichier
├── research.md          # Phase 0 (appels réels à l'API Riot)
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 (14 scénarios)
├── contracts/
│   └── api.openapi.yaml # 2 nouveaux endpoints
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root) — fichiers ajoutés (+) ou modifiés (~)

```text
src/
├── lib/
│   ├── shared/
│   │   ├── types.ts                 ~ LiveGameResult, LiveGame, LiveTeam, LiveParticipant, RankedStats
│   │   └── ranked.ts                + libellés de paliers, formatage « Platine II · 45 LP », « 54 % · 120 V / 102 D »
│   ├── server/
│   │   ├── riot/
│   │   │   ├── schemas.ts           ~ ActiveGameDto, LeagueEntryDto
│   │   │   └── client.ts            ~ getActiveGame (404 → null), getLeagueEntries
│   │   ├── static-data.ts           ~ table championId → nom + icône (champion.json)
│   │   ├── live-game.ts             + service : getLiveGame (sans cache), getRankedStats (cache 10 min)
│   │   └── services.ts              ~ instance liveGame
│   ├── client/
│   │   └── endpoints.ts             ~ getLiveGame, getRankedStats
│   └── components/
│       ├── LiveGameSection.svelte   + bouton, états (idle / checking / card / message / erreur)
│       ├── LiveGameCard.svelte      + en-tête (Classée Solo/Duo · durée), 2 équipes côte à côte
│       ├── LiveTeamColumn.svelte    + 5 lignes joueur : champion, Riot ID cliquable, 👥, ↗, rang, %
│       └── EncounterPanel.svelte    ~ accepte un joueur minimal (puuid, gameName, tagLine)
└── routes/
    ├── joueur/[platform]/[riotId]/+page.svelte   ~ LiveGameSection au-dessus de l'historique
    └── api/
        ├── players/[platform]/[riotId]/live-game/+server.ts   + GET partie en cours
        └── ranked/[platform]/+server.ts                       + GET statistiques (?puuids=)

tests/
├── fixtures/riot/
│   ├── active-game-ranked.json      + partie Solo/Duo (10 joueurs, dont « Moi » et « Ami »)
│   ├── active-game-aram.json        + partie ARAM
│   ├── active-game-loading.json     + gameStartTime = 0
│   ├── league-entries-*.json        + classé, non classé (Flex seulement), vide
│   └── champion.json                + extrait de Data Dragon
└── msw/handlers.ts                  ~ handlers spectator, league, champion.json
```

**Structure Decision**: on étend le projet SvelteKit existant en suivant exactement les conventions
de la feature 001 (service serveur injectable + routes `+server.ts` minces + composants testés en
navigateur). La card a ses propres composants (`LiveTeamColumn`) plutôt que de réutiliser
`TeamTable` : les lignes n'affichent pas les mêmes informations (rang et % au lieu du KDA).

## Notes pour /speckit-tasks

1. Ordre : types + fixtures + MSW → client Riot → static-data → service → routes → composants →
   intégration page.
2. `EncounterPanel` : élargir le type de `participant` sans casser ses tests existants.
3. La durée se calcule côté navigateur à partir de `startedAt` (horloge injectable pour les tests).
4. Après fusion de la PR #1 : rebaser `002-live-game-card` sur `main`.

## Complexity Tracking

Aucune violation de la constitution à justifier.
