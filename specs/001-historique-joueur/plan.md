# Implementation Plan: Historique d'un joueur et « a-t-il déjà joué avec moi ? »

**Branch**: `001-historique-joueur` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-historique-joueur/spec.md`

## Summary

Application web locale permettant de rechercher un joueur League of Legends par Riot ID, de
consulter son historique de matchs (participants inclus) et de savoir, grâce à une analyse des
100 dernières parties du compte de référence, si l'on a déjà joué avec un participant (badge
`👥 N` + résumé détaillé).

Approche : un projet **SvelteKit 3** unique. Le serveur SvelteKit est le seul à appeler l'API
REST de Riot (clé en variable d'environnement, limiteur de débit à deux priorités, cache
mémoire) et expose une **API REST interne** (`+server.ts`) consommée par l'interface Svelte 5 +
Tailwind 4. L'analyse du compte de référence est stockée dans un fichier JSON local derrière une
interface `AnalysisStore` remplaçable. Détails et justifications : [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (pas 7 : incompatible avec SvelteKit 3.1), Node.js ≥ 22.17 (installé : 22.23)

**Primary Dependencies**: SvelteKit 3.1.0, Svelte 5.57.x (runes), Vite 8.3.x, Tailwind CSS 4.3.3 (`@tailwindcss/vite`), zod 4.6.x, `@sveltejs/adapter-node` 6.0.0

**Storage**: fichier JSON local `data/analyses/{puuid}.json` (écriture atomique) derrière l'interface `AnalysisStore` ; cache mémoire TTL pour les réponses Riot ; `localStorage` du navigateur pour le compte de référence

**Testing**: Vitest 4.1.x — projet `server` (Node + MSW 3 pour simuler l'API Riot) et projet `client` (mode navigateur Playwright Chromium + `vitest-browser-svelte`) ; svelte-check ; ESLint 10 + Prettier 3

**Target Platform**: navigateur de bureau récent + serveur Node local (macOS) ; `npm run dev` ou `npm run build && node build`

**Project Type**: application web (front + serveur dans un seul projet SvelteKit)

**Performance Goals**: profil + 20 matchs < 5 s (SC-001) ; profil déjà vu < 1 s (SC-002) ; réponse « déjà joué ? » < 5 s après analyse, analyse initiale < 3 min (SC-003)

**Constraints**: clé de développement Riot : 20 req/s et 100 req/2 min par région, expire toutes les 24 h ; clé jamais côté client ; usage local uniquement

**Scale/Scope**: 1 utilisateur ; 3 écrans (recherche, profil/historique, panneau « parties communes ») ; 4 ressources REST internes ; ~100 matchs analysés par compte de référence

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Avant Phase 0 | Après Phase 1 |
|---|---|---|---|
| **I. Sécurité des secrets** | Clé lue uniquement dans `src/lib/server/config.ts` (dossier `server/` → import client impossible au build) ; en-tête `X-Riot-Token` ; `.env` ignoré, `.env.example` versionné ; messages d'erreur sans clé ; aucune requête navigateur vers `*.api.riotgames.com` (quickstart) | ✅ | ✅ |
| **II. Respect de l'API Riot** | Client unique `riot/client.ts` ; limiteur recalé sur `X-App-Rate-Limit*`, pause `Retry-After` sur 429 ; cache TTL par type de donnée ; analyse incrémentale (jamais 2× le même match) ; Data Dragon pour les images ; mention légale | ✅ | ✅ |
| **III. Tests d'abord** | Chaque tâche d'implémentation précédée de ses tests ; MSW avec `onUnhandledFrame: 'error'` (aucun accès réseau réel) ; cas 401/403/404/429/5xx testés | ✅ | ✅ |
| **IV. Simplicité (YAGNI)** | Pas de base de données, pas de bibliothèque UI, pas de remote functions expérimentales, pas d'E2E automatisé, pas de WebSocket (polling) ; seules abstractions : voir Complexity Tracking | ✅ | ✅ (2 justifications) |
| **V. Spec avant code** | Spec clarifiée et commitée sur la branche `001-historique-joueur` avant ce plan | ✅ | ✅ |
| **VI. Typé, lisible, erreurs explicites** | TypeScript strict ; réponses Riot validées par zod à la frontière ; format d'erreur unique `ApiError` avec message français (data-model.md) ; `svelte-check` + ESLint en quality gate | ✅ | ✅ |
| **Contraintes Riot** | Riot ID → PUUID ; routage plateforme/région explicite (table R7) ; 401/403 = clé invalide ; Data Dragon ; mention légale exacte ; données minimales (fichier local, ignoré par git) | ✅ | ✅ |

**Résultat** : GATE franchi, aucune violation non justifiée.

## Project Structure

### Documentation (this feature)

```text
specs/001-historique-joueur/
├── spec.md              # Spécification (clarifiée)
├── plan.md              # Ce fichier
├── research.md          # Phase 0 : décisions techniques
├── data-model.md        # Phase 1 : modèle de données
├── quickstart.md        # Phase 1 : guide de validation
├── contracts/
│   └── api.openapi.yaml # Phase 1 : contrat de l'API REST interne
├── checklists/
│   └── requirements.md  # Contrôle qualité de la spec
└── tasks.md             # Phase 2 (/speckit-tasks — pas encore créé)
```

### Source Code (repository root)

```text
.env.example                       # RIOT_API_KEY=RGAPI-xxxxxxxx (aucune vraie valeur)
vite.config.ts                     # sveltekit({ adapter: adapter-node }), tailwind, projets Vitest
package.json                       # "imports": { "#lib/*": "./src/lib/*" }
data/                              # (ignoré par git) analyses/{puuid}.json

src/
├── env.ts                         # defineEnvVars({ RIOT_API_KEY }) validé par zod
├── hooks.server.ts                # handleError : log serveur sans secret → ApiError INTERNAL_ERROR
├── app.html
├── lib/
│   ├── shared/                    # utilisable front ET serveur (aucun secret)
│   │   ├── types.ts               # PlayerProfile, MatchSummary, Participant, ApiError…
│   │   ├── riot-id.ts             # parse/valide « Pseudo#TAG » et « gameName-tagLine »
│   │   └── platforms.ts           # liste des serveurs, libellés, défaut euw1
│   ├── server/                    # serveur uniquement (import client = erreur de build)
│   │   ├── config.ts              # SEUL point de lecture de RIOT_API_KEY
│   │   ├── errors.ts              # AppError → Response JSON { error }
│   │   ├── cache.ts               # cache mémoire TTL
│   │   ├── riot/
│   │   │   ├── routing.ts         # plateforme → région (match / account)
│   │   │   ├── rate-limiter.ts    # fenêtres glissantes + 2 priorités + Retry-After
│   │   │   ├── schemas.ts         # schémas zod AccountDto, SummonerDto, MatchDto
│   │   │   └── client.ts          # fetch Riot : auth, limiteur, validation, erreurs typées
│   │   ├── static-data.ts         # Data Dragon (version, URL d'icônes) + libellés des files
│   │   ├── players.ts             # profil + historique paginé → MatchSummary
│   │   └── analysis/
│   │       ├── store.ts           # interface AnalysisStore + JsonFileAnalysisStore
│   │       ├── analyzer.ts        # tâche d'analyse incrémentale + état/progression
│   │       └── encounters.ts      # fonctions pures : badges et EncounterSummary
│   ├── client/
│   │   ├── api.ts                 # appels typés vers /api/... et lecture d'ApiError
│   │   └── reference.svelte.ts    # compte de référence ($state + localStorage)
│   └── components/
│       ├── SearchForm.svelte      # Riot ID + liste déroulante de serveurs
│       ├── PlayerHeader.svelte    # icône, Riot ID, niveau
│       ├── MatchList.svelte       # liste + « Plus de matchs »
│       ├── MatchRow.svelte        # ligne de match dépliable
│       ├── TeamTable.svelte       # 5 participants d'une équipe
│       ├── EncounterBadge.svelte  # 👥 N
│       ├── EncounterPanel.svelte  # résumé + liste des parties communes
│       ├── ReferenceAccount.svelte# définir / modifier / effacer « moi »
│       ├── AnalysisControl.svelte # bouton « Analyser », progression, dernière analyse
│       ├── ErrorMessage.svelte    # affiche une ApiError
│       └── LegalFooter.svelte     # mention légale Riot
└── routes/
    ├── layout.css                 # @import 'tailwindcss';
    ├── +layout.svelte             # en-tête sobre, ReferenceAccount, LegalFooter
    ├── +page.svelte               # accueil : SearchForm
    ├── joueur/[platform]/[riotId]/
    │   ├── +page.ts               # load : profil + 1re page via notre API
    │   └── +page.svelte           # PlayerHeader, MatchList, EncounterPanel
    └── api/
        ├── players/[platform]/[riotId]/
        │   ├── +server.ts                 # GET profil
        │   └── matches/+server.ts         # GET historique paginé
        └── reference/[puuid]/
            ├── analysis/+server.ts        # GET état, POST lancer
            └── encounters/
                ├── +server.ts             # GET badges (?with=…)
                └── [otherPuuid]/+server.ts# GET résumé détaillé

tests/
├── fixtures/riot/                 # réponses Riot JSON réalistes (account, summoner, matchs, erreurs)
├── msw/                           # handlers MSW + serveur partagé (setup du projet `server`)
└── (tests à côté du code : *.test.ts pour le serveur, *.svelte.test.ts pour les composants)
```

**Structure Decision**: projet SvelteKit unique (pas de séparation `frontend/` / `backend/`) :
SvelteKit fournit déjà la frontière client/serveur, et ses dossiers `server/` garantissent au
build que le code contenant la clé ne part jamais dans le navigateur. Les tests vivent à côté du
code (convention de `sv add vitest`) ; seuls les fixtures et la configuration MSW sont dans
`tests/`. Pages en français : `/` et `/joueur/{platform}/{gameName}-{tagLine}`.

## Mise en place du projet (notes pour /speckit-tasks)

1. Sauvegarder `README.md` et `.gitignore` **avant** `sv create` (il les écrase), puis fusionner :
   conserver nos règles (`.env*`, `!.env.example`, `.claude/settings.local.json`) et ajouter `data/`.
2. `npx sv@1.1.1 create . --template minimal --types ts --add tailwindcss="plugins:none" vitest="usages:unit,component" prettier eslint --install npm --no-dir-check`
3. Remplacer `@sveltejs/adapter-auto` par `@sveltejs/adapter-node@6`, figer `typescript@6.0.3`.
4. Installer `zod@4` et `msw@3` (dev) ; `npx playwright install chromium`.
5. Créer `.env.example`, `src/env.ts`, le setup MSW du projet de test `server`.
6. Imports : `#lib/...` **avec extension** (`#lib/shared/riot-id.ts`).

## Complexity Tracking

| Élément ajouté | Pourquoi c'est nécessaire | Alternative plus simple rejetée parce que |
|---|---|---|
| File à **deux priorités** dans le limiteur | Pendant l'analyse (≈ 100 requêtes, tout le quota de 2 min), une recherche attendrait jusqu'à 2 min → viole SC-001 | Une seule file FIFO : la recherche passe derrière l'analyse |
| Interface `AnalysisStore` (+ implémentation JSON) | Demandée explicitement (« module de stockage remplaçable ») ; permet un store en mémoire dans les tests et un passage futur à SQLite sans toucher au reste | Lire/écrire le fichier directement dans l'analyseur : tests liés au disque, migration plus coûteuse |
