# Feature Specification: Rangs illustrés, winrate coloré et rang moyen par équipe

**Feature Branch**: `003-rangs-logos-winrate-moyenne`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Amélioration de la card « Partie en cours » : (1) afficher chaque rang (tier/division) avec son logo/emblème ; (2) afficher le winrate en pourcentage avec une couleur graduée : 50 % = jaune, en dessous de 50 % le jaune glisse progressivement vers le rouge (45 % et moins = bien rouge), au-dessus de 50 % il glisse vers le vert ; (3) afficher un rang moyen par équipe calculé sur les 5 joueurs (ex. : 2 Émeraude 4 + 3 Émeraude 1 → moyenne arrondie « Émeraude 2 »)."

**Depends on**: feature `002-live-game-card` (card « Partie en cours », rang et statistiques Solo/Duo de
chaque joueur : FR-012 à FR-015).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voir le rang de chaque joueur avec son emblème (Priority: P1)

Dans la card « Partie en cours », le rang Solo/Duo de chaque joueur (ex. « Platine II · 45 LP ») est
accompagné de l'emblème officiel de son palier (Fer, Bronze, Argent, Or, Platine, Émeraude, Diamant,
Master, Grandmaster, Challenger). L'utilisateur reconnaît le niveau de chacun d'un coup d'œil, sans
lire le texte.

**Why this priority**: c'est l'amélioration visuelle de base ; elle rend aussi lisibles les rangs
utilisés par la User Story 3.

**Independent Test**: afficher la card d'une partie contenant des joueurs de paliers différents et
vérifier que chacun porte l'emblème correspondant à son palier, et que le joueur non classé n'en porte
pas de faux.

**Acceptance Scenarios**:

1. **Given** un joueur classé Platine II, **When** la card s'affiche, **Then** l'emblème Platine
   apparaît à côté de « Platine II · 45 LP ».
2. **Given** des joueurs de paliers différents, **When** la card s'affiche, **Then** chacun a
   l'emblème de son propre palier (la division ne change pas l'emblème).
3. **Given** un joueur « Non classé », **When** la card s'affiche, **Then** il est indiqué « Non
   classé » avec un emblème neutre « sans rang », jamais l'emblème d'un palier.
4. **Given** un emblème qui ne peut pas être chargé, **When** la card s'affiche, **Then** le rang
   reste lisible en texte et la card n'est pas cassée.

---

### User Story 2 - Voir le winrate coloré selon son niveau (Priority: P2)

Le pourcentage de victoires de chaque joueur est coloré selon une échelle continue : 50 % est jaune ;
en dessous, la couleur glisse progressivement vers le rouge (à 49 % elle commence à rougir, à 45 % et
moins elle est franchement rouge) ; au-dessus de 50 %, elle glisse de la même façon vers le vert (à
55 % et plus, franchement verte). L'utilisateur repère immédiatement les joueurs qui gagnent beaucoup
ou perdent beaucoup.

**Why this priority**: apporte une lecture rapide du niveau réel, mais la card reste utile sans.

**Independent Test**: afficher des joueurs à 40 %, 45 %, 47 %, 50 %, 53 %, 55 % et 60 % et vérifier
que les couleurs sont respectivement rouge, rouge, orangé, jaune, jaune-vert, vert, vert.

**Acceptance Scenarios**:

1. **Given** un joueur à 50 % de victoires, **When** la card s'affiche, **Then** son pourcentage est
   jaune.
2. **Given** un joueur à 45 % ou moins, **When** la card s'affiche, **Then** son pourcentage est
   rouge franc (identique pour 45 % et 30 %).
3. **Given** un joueur à 55 % ou plus, **When** la card s'affiche, **Then** son pourcentage est vert
   franc.
4. **Given** un joueur entre 45 % et 50 % (ou entre 50 % et 55 %), **When** la card s'affiche,
   **Then** la couleur est intermédiaire, d'autant plus proche du rouge (ou du vert) que le
   pourcentage s'en rapproche, de façon continue (47 % est plus rouge que 49 %).
5. **Given** un joueur sans pourcentage (« Non classé », « Statistiques indisponibles »), **When** la
   card s'affiche, **Then** aucune couleur de winrate n'est appliquée.

---

### User Story 3 - Voir le rang moyen de chaque équipe (Priority: P3)

Chaque équipe affiche, dans son en-tête, un rang moyen calculé à partir des rangs de ses joueurs, avec
l'emblème correspondant. Le calcul place les rangs sur une échelle unique (de Fer IV à Challenger),
fait la moyenne et arrondit à l'entier le plus proche. Exemple : 2 joueurs Émeraude IV et 3 joueurs
Émeraude I donnent un rang moyen « Émeraude II ». L'utilisateur compare ainsi d'un coup d'œil le
niveau des deux équipes.

**Why this priority**: valeur de synthèse la plus forte, mais elle repose sur l'affichage des rangs
des User Stories précédentes et sur le chargement des statistiques.

**Independent Test**: afficher une partie dont l'équipe est composée de 2 Émeraude IV et 3 Émeraude I
et vérifier que l'en-tête affiche « Émeraude II » avec l'emblème Émeraude.

**Acceptance Scenarios**:

1. **Given** une équipe de 2 Émeraude IV et 3 Émeraude I, **When** la card s'affiche, **Then**
   l'en-tête de l'équipe affiche « Émeraude II ».
2. **Given** une équipe de 5 joueurs du même rang, **When** la card s'affiche, **Then** le rang moyen
   est ce rang.
3. **Given** une équipe dont le rang moyen est entre deux crans exactement (ex. moyenne 0,5), **When**
   la card s'affiche, **Then** le rang est arrondi vers le haut (Or IV + Or III → Or III).
4. **Given** une équipe mêlant des paliers à divisions et des paliers sans division (Diamant I,
   Master, Grandmaster…), **When** la card s'affiche, **Then** la moyenne tient compte de l'ordre
   réel Diamant I < Master < Grandmaster < Challenger et un résultat Master ou supérieur est affiché
   sans division.
5. **Given** une équipe où des joueurs sont non classés, masqués ou sans statistiques, **When** la
   card s'affiche, **Then** la moyenne est calculée sur les seuls joueurs classés et l'en-tête
   indique sur combien de joueurs elle repose (ex. « 3/5 joueurs classés »).
6. **Given** une équipe sans aucun joueur classé, **When** la card s'affiche, **Then** l'en-tête
   indique « Rang moyen indisponible » sans emblème.
7. **Given** des statistiques encore en cours de chargement, **When** la card s'affiche, **Then**
   l'en-tête affiche un état de chargement puis se met à jour une fois les rangs connus.

---

### Edge Cases

- **Points de ligue (LP)** : ils ne comptent pas dans la moyenne ; seul le cran palier + division est
  utilisé.
- **Joueur masqué par Riot** : exclu de la moyenne, comme un joueur non classé.
- **Moyenne sur échelle Master et plus** : Master, Grandmaster et Challenger comptent chacun pour un
  cran ; pas de division affichée.
- **Winrate pile à 50 %, 45 % ou 55 %** : jaune pur, rouge pur et vert pur respectivement.
- **Winrate non entier** : la couleur se calcule sur le pourcentage exact, même si l'affichage est
  arrondi à l'unité (FR-013 de la 002).
- **Affichage en mode sombre / écran étroit** : emblèmes et couleurs restent lisibles.
- **Accessibilité** : la couleur n'est jamais le seul porteur d'information, le pourcentage reste
  toujours écrit.

## Requirements *(mandatory)*

### Functional Requirements

**Emblèmes de rang**

- **FR-001**: Pour chaque joueur classé de la card, le système DOIT afficher l'emblème de son palier
  à côté du texte de son rang, sans retirer ce texte.
- **FR-002**: L'emblème DOIT dépendre du palier uniquement (la division et les LP ne le changent
  pas), pour les dix paliers : Fer, Bronze, Argent, Or, Platine, Émeraude, Diamant, Master,
  Grandmaster, Challenger.
- **FR-003**: Un joueur non classé DOIT afficher « Non classé » avec un emblème neutre « sans rang ».
  Un joueur masqué ou dont les statistiques sont indisponibles n'affiche aucun emblème.
- **FR-004**: Si un emblème ne peut pas s'afficher, le rang DOIT rester lisible en texte et la card
  NE DOIT PAS être dégradée.

**Winrate coloré**

- **FR-005**: Le pourcentage de victoires DOIT être coloré d'après sa valeur exacte : jaune à 50 %,
  rouge franc à 45 % et moins, vert franc à 55 % et plus, avec un dégradé continu et monotone entre
  ces points (de plus en plus rouge quand le pourcentage baisse vers 45 %, de plus en plus vert
  quand il monte vers 55 %).
- **FR-006**: Le pourcentage DOIT rester affiché en chiffres (la couleur n'est jamais seule), avec un
  contraste lisible sur fond clair et sombre.
- **FR-007**: Aucune couleur de winrate NE DOIT être appliquée aux joueurs sans pourcentage.

**Rang moyen par équipe**

- **FR-008**: Chaque équipe DOIT afficher un rang moyen (palier + division si applicable) avec
  l'emblème correspondant, dans l'en-tête de l'équipe.
- **FR-009**: Le rang moyen DOIT être calculé en convertissant chaque rang en position sur une
  échelle ordonnée unique (Fer IV = la plus basse, puis chaque division croissante, jusqu'à Diamant
  I, puis Master, Grandmaster, Challenger), en faisant la moyenne arithmétique, en arrondissant à
  l'entier le plus proche (0,5 arrondi vers le haut) et en reconvertissant en rang. Les LP sont
  ignorés.
- **FR-010**: Seuls les joueurs classés DOIVENT entrer dans la moyenne ; l'en-tête DOIT indiquer le
  nombre de joueurs pris en compte lorsqu'il est inférieur à la taille de l'équipe (ex. « 3/5
  joueurs classés »).
- **FR-011**: Sans aucun joueur classé dans l'équipe, l'en-tête DOIT indiquer « Rang moyen
  indisponible ».
- **FR-012**: Le rang moyen DOIT se mettre à jour au fur et à mesure que les statistiques des joueurs
  arrivent, sans bloquer l'affichage de la composition des équipes (cohérent avec FR-015 de la 002).

**Conformité**

- **FR-013**: Cette feature NE DOIT PAS augmenter le nombre d'appels à l'API Riot par rapport à la 002
  (elle réutilise les rangs déjà récupérés) ; les emblèmes ne doivent pas être demandés par le
  navigateur à l'API Riot elle-même (constitution, principes I et II).

### Key Entities *(include if feature involves data)*

- **Palier de rang** : un des dix paliers (Fer … Challenger) avec son emblème ; les paliers Fer à
  Diamant ont quatre divisions (IV à I), Master et plus n'en ont pas.
- **Position sur l'échelle** : valeur numérique ordonnée d'un rang (palier + division), servant au
  calcul de la moyenne ; les LP n'en font pas partie.
- **Rang moyen d'équipe** : rang résultant de la moyenne des positions des joueurs classés d'une
  équipe, accompagné du nombre de joueurs pris en compte.
- **Couleur de winrate** : couleur déduite d'un pourcentage de victoires sur l'échelle
  rouge – jaune – vert.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pour 100 % des joueurs classés de la card, l'emblème affiché correspond à leur palier.
- **SC-002**: Un utilisateur identifie le niveau d'une équipe en moins de 5 secondes sans calcul
  mental, grâce au rang moyen.
- **SC-003**: Les couleurs du winrate suivent la règle sur 100 % des valeurs de test (30, 45, 47, 49,
  50, 51, 53, 55, 70 %), avec une variation visible entre 45 % et 55 %.
- **SC-004**: L'exemple de référence (2 Émeraude IV + 3 Émeraude I) donne « Émeraude II » dans 100 %
  des cas de test, ainsi que les cas limites (arrondi à 0,5, paliers sans division, joueurs non
  classés).
- **SC-005**: Aucun appel supplémentaire à l'API Riot n'est effectué par rapport à la feature 002.

## Assumptions

- Les emblèmes sont ceux des paliers du jeu ; leur provenance (fichiers embarqués ou ressources
  publiques) est un choix d'implémentation laissé au plan.
- Les rangs utilisés sont ceux de la classée Solo/Duo de la saison en cours, déjà affichés par la 002.
- Les seuils 45 % / 50 % / 55 % du dégradé sont fixes (non configurables) ; le côté vert est
  symétrique du côté rouge (55 %), par choix par défaut.
- Un rang moyen d'équipe n'est calculé que dans la card « Partie en cours » ; il n'apparaît pas dans
  l'historique.
- Les points de ligue sont ignorés dans la moyenne pour rester simple et lisible.
- Les rangs sont arrondis à l'entier le plus proche, 0,5 vers le haut.
