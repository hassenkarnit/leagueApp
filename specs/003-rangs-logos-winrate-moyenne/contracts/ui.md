# Contrat d'interface : composants modifiés

**Feature**: `003-rangs-logos-winrate-moyenne` — **aucun changement d'API REST** : les endpoints de la
feature 002 (`/live-game`, `/ranked`) sont inchangés (FR-013).

## Nouveau composant `RankEmblem.svelte`

| Prop | Type | Rôle |
|---|---|---|
| `tier` | `string \| null` | palier ; `null` → emblème neutre « sans rang » |
| `size` | `number` (défaut 28) | côté en px |
| `label` | `string` | texte alternatif (ex. « Émeraude ») |

Comportement : `<img src="/ranks/<tier>.png" alt={label}>` ; sur erreur de chargement l'image est
masquée (FR-004), le texte du rang reste présent à côté.

## `LiveTeamColumn.svelte` (modifié)

- **Ligne joueur** : `RankEmblem` à gauche du texte du rang ; le pourcentage « 54 % » reçoit
  `style="color: <winRateColor>"` (le reste de « 54 % · 120 V / 102 D » garde la couleur neutre).
- **En-tête d'équipe** : sous « Équipe bleue/rouge », ligne « Rang moyen : [emblème] Émeraude II ».
  - Pendant le chargement (`stats === null`) : « Rang moyen : calcul… ».
  - `counted < 5` : suffixe « (3/5 joueurs classés) ».
  - Aucun joueur classé : « Rang moyen indisponible », sans emblème.
  - Si `stats === undefined` (non demandé) : rien.

## Fichiers statiques

`static/ranks/{iron,bronze,silver,gold,platinum,emerald,diamond,master,grandmaster,challenger}.png`
(~64 px, issus de Community Dragon, R1).
