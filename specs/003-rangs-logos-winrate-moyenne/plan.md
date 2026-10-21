# Implementation Plan: Rangs illustrés, winrate coloré et rang moyen par équipe

**Branch**: `003-rangs-logos-winrate-moyenne` | **Date**: 2026-10-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-rangs-logos-winrate-moyenne/spec.md`

## Summary

Amélioration d'affichage de la card « Partie en cours » (feature 002) : emblème du palier à côté de
chaque rang, pourcentage de victoires coloré (rouge ≤ 45 % → jaune 50 % → vert ≥ 52 %), et rang
moyen par équipe (échelle Fer IV → Challenger, moyenne arrondie, non classés ignorés).

Approche : **front-end uniquement**, sans nouvelle dépendance ni appel Riot. Fonctions pures dans
`src/lib/shared/ranked.ts` (testées d'abord), un composant `RankEmblem`, modification de
`LiveTeamColumn`. Les 10 emblèmes sont embarqués dans `static/ranks/`. Détails :
[research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js ≥ 22.17 (inchangé)

**Primary Dependencies**: SvelteKit 3.1, Svelte 5, Tailwind CSS 4 — **aucune nouvelle dépendance**

**Storage**: aucun ; 10 images statiques versionnées dans `static/ranks/`

**Testing**: Vitest 4 — projet `server` (fonctions pures de `ranked.ts`) et projet `client`
(navigateur : `RankEmblem`, `LiveTeamColumn`, `LiveGameCard`)

**Target Platform**: navigateur de bureau + serveur Node local (inchangé)

**Project Type**: application web SvelteKit (projet unique, existant)

**Performance Goals**: aucun surcoût perceptible ; emblèmes ~64 px mis en cache par le navigateur

**Constraints**: 0 appel Riot supplémentaire (SC-005) ; couleur jamais seule porteuse d'information ;
texte du rang conservé si l'image échoue

**Scale/Scope**: 1 composant ajouté, 2 modifiés, 1 module de fonctions pures étendu, 10 images

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Avant Phase 0 | Après Phase 1 |
|---|---|---|---|
| **I. Secrets** | Aucun nouvel appel réseau ; emblèmes servis par l'app, aucune clé impliquée | ✅ | ✅ |
| **II. API Riot** | Aucun appel Riot ajouté ; rangs déjà en cache 10 min (002) | ✅ | ✅ |
| **III. Tests d'abord** | Tests unitaires de `rankIndex`, `averageRank`, `winRateColor` et tests composants écrits avant le code, dont les cas limites (0,5, apex, non classés) | ✅ | ✅ |
| **IV. Simplicité** | Pas de dépendance, pas de service ; fonctions pures dans le module existant ; images locales | ✅ | ✅ |
| **V. Spec avant code** | Spec clarifiée et commitée (`e170aed`) sur `003-rangs-logos-winrate-moyenne` | ✅ | ✅ |
| **VI. Typé, erreurs explicites** | Types `RankPosition`, `TeamAverageRank` discriminés ; palier inconnu → pas d'emblème, texte conservé | ✅ | ✅ |

**Résultat** : GATE franchi, aucune violation, aucune complexité à justifier.

## Project Structure

### Documentation (this feature)

```text
specs/003-rangs-logos-winrate-moyenne/
├── spec.md
├── plan.md              # Ce fichier
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/ui.md      # Phase 1 (contrat des composants ; pas de nouvelle API)
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root) — ajoutés (+) ou modifiés (~)

```text
src/lib/
├── shared/
│   ├── ranked.ts                      ~ rankIndex, positionFromIndex, averageRank, winRateColor, emblemUrl
│   └── ranked.test.ts                 ~ tests unitaires correspondants
└── components/
    ├── RankEmblem.svelte              + emblème (ou neutre), masqué si l'image échoue
    ├── RankEmblem.svelte.test.ts      +
    ├── LiveTeamColumn.svelte          ~ emblème + % coloré par joueur, rang moyen en en-tête
    └── LiveGameCard.svelte.test.ts    ~ (régression + rang moyen visible)
static/ranks/                          + 10 PNG (iron … challenger), ~64 px
tests/fixtures/app/live-game.ts        ~ éventuels helpers de stats par rang
```

**Structure Decision**: on étend le projet existant en suivant les conventions de la 002 (module
partagé de fonctions pures + composants Svelte testés en navigateur). Pas de nouveau composant pour
le rang moyen : un simple bloc dans `LiveTeamColumn`, qui possède déjà `stats`.

## Notes pour /speckit-tasks

1. Ordre : tests unitaires `ranked.ts` (Red) → fonctions pures (Green) → images `static/ranks/` →
   `RankEmblem` (test puis code) → `LiveTeamColumn` (US1 emblèmes, US2 couleur, US3 moyenne) →
   quality gate.
2. Chaque user story reste livrable seule (US1 → US2 → US3).

## Complexity Tracking

Aucune violation : section vide.
