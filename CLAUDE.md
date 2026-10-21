# LeagueApp

App web **locale** de suivi de joueurs League of Legends (API Riot). Utilisateur francophone,
débutant : répondre en français, expliquer simplement, avancer étape par étape.

## Méthode : SDD avec Spec Kit (obligatoire)

- Règles du projet : `.specify/memory/constitution.md` (secrets côté serveur, respect des quotas
  Riot, TDD, YAGNI, spec avant code, code typé).
- Une feature = `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-analyze` → `/speckit-implement`, dans `specs/NNN-nom/`, sur une branche `NNN-nom` créée
  depuis `main`. Pas de code sans `tasks.md`.
- Un changement de comportement → mettre à jour spec / data-model / contrat **avant** le code.
- Fin de feature : PR vers `main`, fusion par **commit de fusion** (pas de squash).
- Features livrées : `001-historique-joueur`, `002-live-game-card`, `003-rangs-logos-winrate-moyenne` (emblèmes dans `static/ranks/`, winrate coloré, rang moyen par équipe ; fonctions pures dans `src/lib/shared/ranked.ts`).

## Stack et commandes

SvelteKit 3.1 · Svelte 5 (runes) · TypeScript **6.0.3** · Tailwind 4 · Vitest 4 + MSW 3 · zod 4 ·
adapter-node. Clé Riot dans `.env` (`RIOT_API_KEY`, expire toutes les 24 h, jamais commitée).

```bash
npm run dev     # http://localhost:5173
npm run test    # projets Vitest « server » (Node + MSW) et « client » (navigateur Chromium)
npm run check   # types
npm run lint    # Prettier + ESLint
```

Quality gate avant commit : `test`, `check` et `lint` au vert.

## Pièges connus

- **SvelteKit 3** : imports `#lib/...` **avec extension** (`#lib/shared/types.ts`), pas `$lib` ;
  env via `src/env.ts` + `$app/env/private` ; `Response.json()` ; `$app/state` ; liens avec
  `resolve()` de `$app/paths` (règle ESLint) ; types des hooks dans `@sveltejs/kit/hooks`.
- **TypeScript 7 interdit** (incompatible avec kit, svelte-check, typescript-eslint).
- **Prettier** ne doit pas toucher `.claude/`, `.specify/`, `specs/` (exclus dans `.prettierignore`).
- **Svelte 5** : pas de `bind:` vers une valeur `undefined` si la prop a une valeur par défaut
  (utiliser une liaison getter/setter) ; espaces supprimés en début de bloc `{#if}` (les écrire
  dans des chaînes).
- **Tests** : tout appel Riot passe par MSW (`tests/msw/`) ; les tests de routes simulent
  `#lib/server/services.ts` avec `tests/helpers/services.ts` (fausse clé, stockage en mémoire) ;
  ne jamais utiliser la vraie clé de `.env` dans un test.
- **API Riot** (vérifié en réel) :
  - spectator-v5 : 404 = « pas en partie » (pas une erreur) ; `championId` numérique (→ Data
    Dragon `champion.json`) ; certains joueurs sont **masqués** (`puuid: null`, `riotId` = nom du
    champion).
  - 403/404 sur un détail de match = match indisponible (Brawl…), pas une clé invalide.
  - clé expirée → 401 ; `featured-games` refusé (403) avec une clé de dev.
  - aucun endpoint ne donne le meilleur rang de carrière (saison en cours seulement).
  - scripts Python : Cloudflare bloque le User-Agent par défaut → en définir un.
- **Données locales** : `data/analyses/` (analyses JSON, ignoré par git) — ne pas supprimer.
