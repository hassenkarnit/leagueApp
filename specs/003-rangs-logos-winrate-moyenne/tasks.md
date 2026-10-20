---

description: "Task list for feature 003-rangs-logos-winrate-moyenne"
---

# Tasks: Rangs illustrés, winrate coloré et rang moyen par équipe

**Input**: Design documents from `specs/003-rangs-logos-winrate-moyenne/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: **OBLIGATOIRES** (constitution, principe III) — chaque test est écrit et vu **en échec**
avant le code. Aucun appel Riot nouveau : pas de MSW à ajouter.

**Organization**: tâches groupées par user story (US1 emblèmes → US2 couleur → US3 rang moyen).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallélisable (fichiers différents, pas de dépendance)
- **[Story]**: US1, US2, US3

## Conventions

Identiques aux features 001/002 : imports `#lib/...` avec extension, runes Svelte 5, tests serveur
`*.test.ts` (Node), tests composants `*.svelte.test.ts` (navigateur), Tailwind `zinc` + accent indigo.

---

## Phase 1: Setup

- [ ] T001 Vérifier la base : branche `003-rangs-logos-winrate-moyenne`, `npm run test` / `check` / `lint` au vert avant tout changement
- [ ] T002 [P] Télécharger les 10 emblèmes depuis `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/ranked-emblem/emblem-<palier>.png` (avec un User-Agent défini), les réduire à ~64 px de large (`sips -Z 64` sous macOS) et les enregistrer dans `static/ranks/{iron,bronze,silver,gold,platinum,emerald,diamond,master,grandmaster,challenger}.png` (research R1) ; vérifier que chaque fichier est < 20 Ko

---

## Phase 2: Foundational

Aucune tâche bloquante : les fonctions pures sont rattachées aux user stories qui les utilisent.

---

## Phase 3: User Story 1 — Emblème de rang (Priority: P1) 🎯 MVP

**Goal**: chaque joueur classé affiche l'emblème de son palier ; « Non classé » un emblème neutre.

**Independent Test**: card avec joueurs de paliers variés → bon emblème par joueur, neutre pour non classé, texte conservé si l'image échoue.

### Tests (écrire d'abord, les voir échouer)

- [ ] T003 [P] [US1] Tests unitaires de `emblemUrl` dans `src/lib/shared/ranked.test.ts` : `'EMERALD'` → `/ranks/emerald.png` ; les 10 paliers renvoient une URL ; palier inconnu / `null` → `null`
- [ ] T004 [P] [US1] Tests composant `RankEmblem` dans `src/lib/components/RankEmblem.svelte.test.ts` : `tier="GOLD"` → `<img alt="Or">` avec `src="/ranks/gold.png"` ; `tier=null` → emblème neutre (`role="img"`, nom « Sans rang ») sans `<img>` de palier ; l'événement `error` de l'image la masque (FR-004)
- [ ] T005 [US1] Tests dans `src/lib/components/LiveGameCard.svelte.test.ts` : un joueur classé Platine II affiche l'emblème « Platine » et le texte « Platine II · 45 LP » ; un joueur `unranked` affiche l'emblème « Sans rang » et « Non classé » ; un joueur `unavailable` ou masqué n'affiche aucun emblème (FR-003)

### Implementation

- [ ] T006 [US1] Ajouter `emblemUrl(tier: string | null): string | null` dans `src/lib/shared/ranked.ts` (T003 passe)
- [ ] T007 [P] [US1] Créer `src/lib/components/RankEmblem.svelte` selon `contracts/ui.md` (props `tier`, `size = 28`, `label` ; SVG inline neutre en pointillés ; `onerror` masque l'image) (T004 passe)
- [ ] T008 [US1] Modifier `src/lib/components/LiveTeamColumn.svelte` : afficher `RankEmblem` à gauche du texte du rang (`ranked` → palier, `unranked` → neutre, `unavailable` → rien) (T005 passe)

**Checkpoint**: US1 livrable seule.

---

## Phase 4: User Story 2 — Winrate coloré (Priority: P2)

**Goal**: pourcentage coloré rouge (≤ 45 %) → jaune (50 %) → vert (≥ 52 %), continu.

**Independent Test**: joueurs à 40, 45, 47, 50, 51, 52, 60 % → couleurs conformes ; pourcentage toujours écrit.

### Tests (écrire d'abord)

- [ ] T009 [P] [US2] Tests unitaires de `winRateColor(wins, losses)` dans `src/lib/shared/ranked.test.ts` (research R3, pourcentage **exact**) : ≤ 45 % (ex. 30 %, 45 %) → même couleur `hsl(0 …)` ; 50 % → teinte 48 ; ≥ 52 % (52 %, 60 %) → teinte 130 ; 47 % a une teinte < 49 % ; 51 % a une teinte > 50,5 % ; la teinte est monotone croissante de 45 % à 52 % ; 108 V / 108 D → 50 %
- [ ] T010 [US2] Tests dans `src/lib/components/LiveGameCard.svelte.test.ts` : le « 54 % » d'un joueur classé a un `style` couleur non vide égal à `winRateColor` ; le texte « 54 % · 120 V / 102 D » reste intact ; un joueur `unranked` / `unavailable` n'a aucune couleur de winrate (FR-007)

### Implementation

- [ ] T011 [US2] Ajouter `winRateColor(wins, losses): string` dans `src/lib/shared/ranked.ts` : teinte HSL interpolée (0 → 48 sur 45–50 %, 48 → 130 sur 50–52 %, bornée), saturation 85 %, luminosité 36 % (T009 passe)
- [ ] T012 [US2] Modifier `src/lib/components/LiveTeamColumn.svelte` : isoler le pourcentage dans un `<span style="color: …">` appliquant `winRateColor` (T010 passe) ; `formatRecord` reste inchangé ou est scindé pour garder « · V / D » en couleur neutre

**Checkpoint**: US2 livrable seule (indépendante d'US1).

---

## Phase 5: User Story 3 — Rang moyen par équipe (Priority: P3)

**Goal**: en-tête d'équipe avec rang moyen + emblème (non classés ignorés, « N/5 joueurs classés »).

**Independent Test**: équipe 2 × Émeraude IV + 3 × Émeraude I → « Émeraude II ».

### Tests (écrire d'abord)

- [ ] T013 [P] [US3] Tests unitaires de `rankIndex` / `positionFromIndex` dans `src/lib/shared/ranked.test.ts` : Fer IV = 0, Émeraude IV = 20, Émeraude I = 23, Diamant I = 27, Maître = 28, Grand Maître = 29, Challenger = 30 ; aller-retour `positionFromIndex(rankIndex(x))` ; palier inconnu → erreur explicite
- [ ] T014 [P] [US3] Tests unitaires de `averageRank(stats, teamSize)` dans `src/lib/shared/ranked.test.ts` : 2 × Émeraude IV + 3 × Émeraude I → Émeraude II (`counted: 5`) ; 5 × Or III → Or III ; Or IV + Or III → Or III (0,5 ↑) ; mix Diamant I + Maître + Grand Maître → apex sans division (libellés `TIER_LABELS` : « Maître », « Grand Maître ») ; un palier inconnu est ignoré comme un non-classé, sans erreur ; 3 `ranked` + 1 `unranked` + 1 `unavailable` → `counted: 3`, `teamSize: 5` ; aucun classé → `{ status: 'unavailable' }` ; les LP n'influencent pas
- [ ] T015 [US3] Tests dans `src/lib/components/LiveGameCard.svelte.test.ts` : l'en-tête de chaque équipe affiche « Rang moyen » + « Émeraude II » + emblème pour l'exemple de référence ; « (3/5 joueurs classés) » quand incomplet ; « Rang moyen indisponible » sans emblème si aucun classé ; « calcul… » quand `stats === null` ; rien quand `stats` est absent ; mise à jour quand `stats` passe de `null` à une valeur (FR-012)

### Implementation

- [ ] T016 [US3] Ajouter dans `src/lib/shared/ranked.ts` les types `RankPosition`, `TeamAverageRank` et les fonctions `rankIndex`, `positionFromIndex` (T013 passe) puis `averageRank` (ignore tout joueur dont le palier est inconnu au lieu de planter ; arrondi `Math.floor(somme / n + 0.5)`, libellé via `TIER_LABELS`) (T014 passe)
- [ ] T017 [US3] Modifier `src/lib/components/LiveTeamColumn.svelte` : `$derived` du rang moyen d'après `stats` et `team.participants`, bloc « Rang moyen : [emblème] Émeraude II (N/5 joueurs classés) » sous le titre d'équipe, états chargement / indisponible selon `contracts/ui.md` (T015 passe)

**Checkpoint**: les trois stories fonctionnent ensemble.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T018 Vérifier la régression de la feature 002 : tous les tests existants (`LiveGameCard`, `LiveGameSection`, `live-game`) restent verts sans modification d'API ; aucun nouvel appel réseau (SC-005)
- [ ] T019 [P] Accessibilité (pas de mode sombre dans l'app ; vérifier aussi l'écran étroit) : contraste du pourcentage sur fond blanc et sur la ligne mise en évidence (`bg-indigo-50`) ; le pourcentage reste écrit ; emblèmes avec `alt`
- [ ] T020 Quality gate : `npm run test`, `npm run check`, `npm run lint` au vert
- [ ] T021 Exécuter `quickstart.md` en réel (scénarios 1 à 7) avec une clé Riot valide, si un joueur est en partie classée ; sinon valider via les tests et le consigner dans la PR
- [ ] T022 Mettre à jour `CLAUDE.md` : « Features livrées » (ajouter `003-rangs-logos-winrate-moyenne`) et, si utile, l'emplacement `static/ranks/`

---

## Dependencies & Execution Order

- Phase 1 d'abord. US1 → US2 → US3 par priorité ; chaque story est testable seule (US3 réutilise `RankEmblem` d'US1 : T017 dépend de T007).
- Dans chaque story : tests (Red) → fonctions pures → composant.
- T008, T012, T017 modifient le même fichier `LiveTeamColumn.svelte` : **pas en parallèle**.
- T005, T010, T015 modifient le même fichier de test : séquentiels.

### Parallel opportunities

- T002 (images) en parallèle de tout le code.
- Phase 3 : T003 ∥ T004. Phase 5 : T013 ∥ T014. T009 peut être écrit pendant US1.

## Implementation Strategy

1. **MVP = US1** (emblèmes) : T001 → T008, valider, commit.
2. Puis US2 (couleur), puis US3 (rang moyen), un commit par story.
3. Polish, quality gate, PR vers `main`, fusion par commit de fusion.
