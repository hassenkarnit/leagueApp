# Quickstart : valider la feature 001-historique-joueur

Guide pour **lancer l'application et vérifier à la main** que la feature respecte la
[spec](./spec.md). Les contrats de l'API sont dans [contracts/api.openapi.yaml](./contracts/api.openapi.yaml),
les données dans [data-model.md](./data-model.md).

## Prérequis

- Node **22.17 ou plus** (`node --version`)
- Une **clé de développement Riot** : https://developer.riotgames.com → « Development API Key »
  (elle expire toutes les 24 h)
- Ton propre Riot ID (ex. `MonPseudo#EUW`) et celui d'un joueur avec qui tu as joué récemment

## Installation (une seule fois)

```bash
npm install
npx playwright install chromium   # navigateur utilisé par les tests de composants
cp .env.example .env              # puis colle ta clé dans .env : RIOT_API_KEY=RGAPI-...
```

> ⚠️ Ne commite jamais `.env`. Vérifie avec `git status` qu'il n'apparaît pas.

## Vérifications automatiques (doivent toutes passer)

```bash
npm run test      # tests unitaires + composants (API Riot simulée, pas de réseau)
npm run check     # vérification des types (svelte-check)
npm run lint      # linter + formatage
```

## Lancer l'application

```bash
npm run dev       # → http://localhost:5173
```

## Scénarios de validation manuelle

| # | Action | Résultat attendu | Spec |
|---|---|---|---|
| 1 | Rechercher `Pseudo` (sans `#`) | Message de format, aucune recherche lancée | FR-002 |
| 2 | Rechercher un Riot ID inexistant (ex. `zzzzqq#0000`) | « Joueur introuvable… » | US1-4, FR-018 |
| 3 | Rechercher un joueur réel, serveur correct | Profil + 20 matchs (champion, résultat, KDA, mode, date, durée) en < 5 s | US1-1, SC-001 |
| 4 | Déplier un match | 10 participants répartis en 2 équipes | US1-2, FR-008 |
| 5 | Cliquer sur « Plus de matchs » | 20 matchs plus anciens ajoutés | US1-3, FR-007 |
| 6 | Relancer la même recherche dans les 5 min | Réaffichage en < 1 s | SC-002 |
| 7 | Cliquer sur un participant **sans** compte de référence | Invitation à définir ton Riot ID | US2-4, FR-016 |
| 8 | Définir ton compte de référence, recharger la page | Le compte est toujours défini | FR-009 |
| 9 | Cliquer sur un participant avant toute analyse | Invitation à lancer l'analyse, aucun badge | US2-5, FR-016 |
| 10 | Cliquer sur « Analyser mon historique » | Progression « N / 100 », fin en < 3 min, date de dernière analyse affichée | US2-6, FR-012a/b, SC-003 |
| 11 | Pendant l'analyse, rechercher un autre joueur | La recherche reste rapide (< 5 s) | SC-001 |
| 12 | Ouvrir un de tes matchs | Badge `👥 N` sur les joueurs déjà croisés, rien sur les autres, « C'est vous » sur toi | US2-8, US2-7, FR-010a |
| 13 | Cliquer sur un joueur avec badge | Total, même équipe / adversaires, V/D, dernière partie, liste détaillée | US2-1, US2-2 |
| 14 | Cliquer sur un joueur sans badge | « Jamais joué ensemble » + période analysée | US2-3, FR-013 |
| 15 | Relancer l'analyse | Quasi instantanée (seules les nouvelles parties sont téléchargées) | FR-012a |
| 16 | « Voir le profil » d'un participant puis retour | Profil du participant, puis retour à l'historique précédent | US3 |
| 17 | Mettre une fausse clé dans `.env`, relancer, rechercher | Message « Clé API Riot invalide ou expirée… », la clé n'apparaît nulle part | FR-018, principe I |
| 18 | Regarder le pied de page | Mention légale Riot présente sur toutes les pages | FR-020 |

## Vérifier qu'aucun secret ne fuit

```bash
git grep -n "RGAPI-" -- ':!.env.example'   # ne doit rien trouver
```

Dans le navigateur (outils de développement → Réseau) : aucune requête vers
`*.api.riotgames.com`, seulement vers `/api/...` et `ddragon.leagueoflegends.com`.
