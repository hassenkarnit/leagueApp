# Data Model: Rangs illustrés, winrate coloré et rang moyen

**Feature**: `003-rangs-logos-winrate-moyenne`

Aucune donnée persistée, aucun nouveau champ renvoyé par le serveur : tout est **dérivé de
`RankedStats`** (feature 002, `src/lib/shared/types.ts`). Les types ci-dessous sont des types
d'affichage ajoutés à `src/lib/shared/ranked.ts`.

## Échelle de rang (R2)

| Palier | Divisions | Index |
|---|---|---|
| Fer (IRON) | IV → I | 0 – 3 |
| Bronze | IV → I | 4 – 7 |
| Argent (SILVER) | IV → I | 8 – 11 |
| Or (GOLD) | IV → I | 12 – 15 |
| Platine (PLATINUM) | IV → I | 16 – 19 |
| Émeraude (EMERALD) | IV → I | 20 – 23 |
| Diamant (DIAMOND) | IV → I | 24 – 27 |
| Maître (MASTER) | — | 28 |
| Grand Maître (GRANDMASTER) | — | 29 |
| Challenger | — | 30 |

Les LP n'entrent pas dans l'index.

## Types

```ts
/** Rang ramené à palier + division (sans LP), pour l'échelle et la moyenne. */
type RankPosition = { tier: string; division: string | null };

/** Rang moyen d'une équipe (FR-008 à FR-011). */
type TeamAverageRank =
  | { status: 'average'; tier: string; tierLabel: string; division: string | null;
      counted: number; teamSize: number }
  | { status: 'unavailable' };      // aucun joueur classé
```

## Fonctions pures (`ranked.ts`)

| Fonction | Entrée → Sortie | Règle |
|---|---|---|
| `rankIndex(position)` | `RankPosition` → `number` (0–30) | échelle ci-dessus ; palier inconnu → erreur explicite |
| `positionFromIndex(index)` | `number` → `RankPosition` | reconversion (R2) |
| `averageRank(stats[], teamSize)` | `RankedStats[]` → `TeamAverageRank` | ne garde que `status = 'ranked'` ; moyenne arrondie 0,5 ↑ ; `unavailable` si aucun |
| `winRateColor(wins, losses)` | → `string` CSS `hsl(...)` | pourcentage exact, R3 |
| `emblemUrl(tier)` | `string` → `string \| null` | `/ranks/<tier>.png` ; `null` si palier inconnu |

## Règles de validation

- `averageRank` : `counted` ≤ `teamSize` ; `counted < teamSize` ⇒ affichage « N/5 joueurs classés »
  (FR-010).
- `winRateColor` : monotone, continue, bornée (45 → rouge, 52 → vert) ; jamais appelée pour un
  joueur `unranked` / `unavailable` (FR-007).
- Un joueur masqué n'a pas de `RankedStats` → ignoré de la moyenne (spec, cas limites).
