# Research: Rangs illustrés, winrate coloré et rang moyen par équipe

**Feature**: `003-rangs-logos-winrate-moyenne` | **Date**: 2026-10-21

Aucun `NEEDS CLARIFICATION` ne subsiste après `/speckit-clarify`. Cette feature est purement
d'affichage : elle réutilise `RankedStats` (feature 002), donc **aucun nouvel appel Riot** (FR-013).

## R1 — Source des emblèmes de rang

- **Constat (vérifié)** : Data Dragon ne fournit pas les emblèmes de rang. Community Dragon les
  publie : `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/ranked-emblem/emblem-<palier>.png`
  (iron, bronze, silver, gold, platinum, emerald, diamond, master, grandmaster, challenger → HTTP
  200). Il n'existe pas d'emblème « sans rang » (`emblem-unranked.png` → 404).
- **Décision** : télécharger **une fois** les 10 emblèmes, les réduire (~64 px, ils s'affichent à
  ~28 px) et les **versionner dans `static/ranks/`** (`iron.png` … `challenger.png`). Servis par
  l'application elle-même.
- **Pour « Non classé »** : petit SVG inline (cercle en pointillés) — aucun fichier.
- **Justification** : aucune dépendance réseau à l'exécution, aucun hôte tiers à autoriser, pas de
  clé ni de quota en jeu, affichage instantané, fonctionne hors ligne (principes I, II, IV).
- **Alternatives rejetées** : `<img>` pointant vers Community Dragon (dépendance à un service
  tiers non officiel, URL pouvant changer) ; emblèmes en pleine taille (230 Ko pour Émeraude, trop
  lourd pour 28 px) ; emoji/ronds colorés (ne sont pas « les logos » demandés).
- **Note de conformité** : les emblèmes sont des assets Riot ; ils sont utilisés dans l'esprit de la
  politique « Legal Jibber Jabber » déjà mentionnée dans le pied de page (usage non commercial, app
  locale).

## R2 — Échelle de rang et moyenne

- **Décision** : index entier par rang.
  - Fer → Diamant : `index = rangDuPalier × 4 + (4 − numéroDeDivision)` avec rangDuPalier = 0 (Fer)
    … 6 (Diamant), division IV → 0 … I → 3 (Fer IV = 0, Diamant I = 27).
  - Maître = 28, Grand Maître = 29, Challenger = 30 (un cran chacun, sans division).
- **Moyenne** : `Math.floor(somme / n + 0.5)` (arrondi au plus proche, 0,5 vers le haut, FR-009).
- **Contrôle de l'exemple** : Émeraude IV = 20, Émeraude I = 23 → (2×20 + 3×23)/5 = 21,8 → 22 =
  Émeraude II ✔.
- **Reconversion** : index ≥ 28 → apex ; sinon palier = ⌊index/4⌋, division = 4 − (index mod 4).
- **Alternative rejetée** : pondérer par les LP (complexité, non demandé — YAGNI).

## R3 — Couleur du winrate

- **Décision** : couleur **HSL** interpolée linéairement sur la teinte, d'après le pourcentage
  **exact** `wins / (wins + losses) × 100` (non arrondi) :
  - `≤ 45 %` → teinte 0 (rouge) ; `50 %` → teinte 48 (jaune/or) ; `≥ 52 %` → teinte 130 (vert) ;
  - entre 45 et 50 : teinte = 48 × (p − 45) / 5 ; entre 50 et 52 : teinte = 48 + 82 × (p − 50) / 2.
  - Saturation 85 %, luminosité 36 % : lisible sur le fond blanc de la card (le jaune clair pur
    serait illisible). Retourne une chaîne `hsl(…)` appliquée en style inline.
- **Accessibilité** : le pourcentage reste écrit (FR-006) ; la couleur n'est qu'un renfort.
- **Alternatives rejetées** : classes Tailwind par paliers (pas de dégradé continu, FR-005) ;
  interpolation RGB (passe par un marron boueux entre rouge et vert).

## R4 — Où placer le code

- **Décision** : tout dans `src/lib/shared/ranked.ts` (fonctions pures : `rankIndex`,
  `averageRank`, `winRateColor`, `emblemUrl`) + un composant `RankEmblem.svelte`. Le rang moyen est
  calculé dans `LiveTeamColumn` (dérivé de `stats`), donc il se met à jour tout seul quand les
  statistiques arrivent (FR-012).
- **Justification** : fonctions pures = tests unitaires Vitest rapides, TDD (principe III) ; pas de
  nouvelle couche ni dépendance (principe IV).
