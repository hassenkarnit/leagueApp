# LeagueApp

Application web de suivi de joueurs League of Legends basée sur l'API Riot Games.

## Fonctionnalités

- **Recherche d'un joueur** par Riot ID (`Pseudo#TAG`) sur l'un des 15 serveurs, avec son profil
  et l'historique de ses matchs (champion, résultat, KDA, mode, date, durée), 20 par 20.
- **Détail d'un match** : les 10 participants répartis en deux équipes, avec un lien vers leur profil.
- **« Ai-je déjà joué avec ce joueur ? »** : définis ton compte (« Moi »), lance l'analyse de tes
  100 dernières parties, puis repère d'un coup d'œil les joueurs déjà croisés (badge `👥 N`) et
  consulte le détail (même équipe / adversaires, victoires / défaites, dernière partie).
- Application **locale** : la clé API Riot reste sur ton ordinateur, côté serveur.

## Mention légale

> LeagueApp isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games
> or anyone officially involved in producing or managing Riot Games properties. Riot Games, and
> all associated properties are trademarks or registered trademarks of Riot Games, Inc.

_Traduction : LeagueApp n'est ni approuvé ni soutenu par Riot Games et ne reflète pas les
opinions de Riot Games ni de quiconque officiellement impliqué dans la production ou la gestion
des propriétés de Riot Games. Riot Games et toutes les propriétés associées sont des marques
commerciales ou des marques déposées de Riot Games, Inc._

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
