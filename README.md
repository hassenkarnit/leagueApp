# LeagueApp

Application web de suivi de joueurs League of Legends basée sur l'API Riot Games.

> LeagueApp n'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games ou
> de quiconque officiellement impliqué dans la production ou la gestion des propriétés de
> Riot Games. Riot Games et toutes les propriétés associées sont des marques commerciales ou
> des marques déposées de Riot Games, Inc.

## Méthode : Spec-Driven Development (SDD)

Ce projet est développé avec [Spec Kit](https://github.com/github/spec-kit) : chaque
fonctionnalité est d'abord décrite (spec), puis planifiée (plan), découpée (tâches) et enfin
codée, tests en premier.

| Document                                        | Rôle                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| [Constitution](.specify/memory/constitution.md) | Règles non négociables du projet                                 |
| [`specs/`](specs/)                              | Un dossier par fonctionnalité : `spec.md`, `plan.md`, `tasks.md` |

### Workflow d'une fonctionnalité

1. `/speckit-specify` — décrire le **quoi** et le **pourquoi**
2. `/speckit-clarify` — lever les ambiguïtés
3. `/speckit-plan` — décider le **comment** (technique)
4. `/speckit-tasks` — découper en tâches
5. `/speckit-analyze` — vérifier la cohérence
6. `/speckit-implement` — coder, tests d'abord

## Organisation du dépôt

| Emplacement       | Contenu                                                |
| ----------------- | ------------------------------------------------------ |
| `specs/`          | Specs, plans et tâches de chaque fonctionnalité        |
| `.specify/`       | Outillage Spec Kit (templates, scripts) + constitution |
| `.claude/skills/` | Commandes `/speckit-*` pour Claude Code                |

## Sécurité

La clé API Riot se place dans un fichier `.env` (jamais commité). Ne jamais la partager ni
la coller dans le code.

## Développement

Prérequis : Node.js ≥ 22.17.

```bash
npm install                      # dépendances
npx playwright install chromium  # navigateur pour les tests de composants
cp .env.example .env             # puis colle ta clé Riot dans .env
npm run dev                      # → http://localhost:5173
```

| Commande                          | Rôle                                            |
| --------------------------------- | ----------------------------------------------- |
| `npm run test`                    | Tests unitaires + composants (API Riot simulée) |
| `npm run check`                   | Vérification des types                          |
| `npm run lint`                    | Formatage (Prettier) + linter (ESLint)          |
| `npm run format`                  | Reformate le code                               |
| `npm run build` puis `node build` | Version optimisée en local                      |

Stack : SvelteKit 3 · Svelte 5 · TypeScript 6 · Tailwind CSS 4 · Vitest · MSW · zod.
