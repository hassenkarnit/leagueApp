# Feature Specification: Card « Partie en cours » (classée Solo/Duo)

**Feature Branch**: `002-live-game-card`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Sur le profil d'un joueur, si ce joueur est actuellement en partie, je veux voir une card \"Partie en cours\" en haut : mode de jeu, depuis combien de temps la partie a commencé, et les 10 joueurs répartis en deux équipes avec leur champion. Si mon historique a été analysé, les joueurs que j'ai déjà croisés ont le badge 👥 et je peux cliquer dessus pour voir nos parties communes. Si le joueur n'est pas en partie, rien ne s'affiche. Le but : savoir qui je connais dans ma partie pendant l'écran de chargement."

**Depends on**: feature `001-historique-joueur` (profil d'un joueur, compte de référence,
analyse des parties, badges `👥`, panneau « parties communes », lien « Voir le profil »).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Afficher la partie classée Solo/Duo en cours d'un joueur (Priority: P1)

Pendant l'écran de chargement, l'utilisateur recherche son propre Riot ID (ou celui de n'importe
quel joueur). Sur le profil, il clique sur « Actualiser la partie en cours ». Si le joueur est en
partie classée Solo/Duo, une grande card apparaît en haut du profil, au-dessus de l'historique :
les deux équipes de 5 joueurs y sont entièrement visibles, sans rien à déplier, avec pour chacun
son Riot ID et son champion, ainsi que la durée écoulée de la partie. Sinon, un court message
indique qu'il n'y a pas de partie classée Solo/Duo en cours.

**Why this priority**: c'est le socle de la feature : sans la card, ni les badges ni les
statistiques n'ont où s'afficher. Seule, elle apporte déjà de la valeur (voir la composition
d'une partie classée en direct).

**Independent Test**: ouvrir le profil d'un joueur en partie classée Solo/Duo, cliquer sur
« Actualiser la partie en cours » et vérifier que la card affiche les deux équipes complètes ;
faire de même avec un joueur hors partie et vérifier le message « Pas de partie classée Solo/Duo
en cours ».

**Acceptance Scenarios**:

1. **Given** le profil d'un joueur ouvert, **When** la page s'affiche, **Then** aucune
   vérification n'a lieu et seul le bouton « Actualiser la partie en cours » est visible.
2. **Given** un joueur en partie classée Solo/Duo, **When** l'utilisateur clique sur
   « Actualiser la partie en cours », **Then** la card s'affiche en haut avec la mention
   « Classée Solo/Duo », la durée écoulée et les deux équipes de 5 joueurs entièrement visibles
   (Riot ID et champion de chacun).
3. **Given** la card affichée, **When** le temps passe, **Then** la durée écoulée avance d'elle-même
   sans recharger la page.
4. **Given** une partie encore à l'écran de chargement, **When** la card s'affiche, **Then** elle
   indique « Écran de chargement » au lieu d'une durée.
5. **Given** un joueur hors partie, **When** l'utilisateur clique sur le bouton, **Then** le
   message « Pas de partie classée Solo/Duo en cours » s'affiche, sans card.
6. **Given** un joueur en partie d'un autre mode (ARAM, normale, Flex…), **When** l'utilisateur
   clique sur le bouton, **Then** le message indique que le joueur est en partie, mais pas en
   classée Solo/Duo (ex. « En partie (ARAM), pas en classée Solo/Duo »), sans card.
7. **Given** la card affichée, **When** l'utilisateur clique à nouveau sur le bouton et que la
   partie est terminée, **Then** la card disparaît et le message « Pas de partie classée Solo/Duo
   en cours » s'affiche.
8. **Given** la vérification impossible (service Riot indisponible, quota atteint), **When**
   l'utilisateur clique sur le bouton, **Then** un message clair l'indique, et le profil et
   l'historique restent affichés normalement.

---

### User Story 2 - Repérer les joueurs déjà croisés dans la partie (Priority: P2)

Si l'utilisateur a défini son compte de référence et analysé son historique (feature 001), la
card affiche le badge `👥 N` à côté de chaque joueur déjà croisé. Un clic sur un joueur ouvre le
panneau « parties communes » existant.

**Why this priority**: c'est l'objectif de départ (« savoir qui je connais dans ma partie pendant
l'écran de chargement ») ; il repose sur la card de la User Story 1 et sur l'analyse de la 001.

**Independent Test**: avec un compte de référence analysé, afficher la card d'une partie
contenant au moins un joueur déjà croisé : le badge apparaît sur ce joueur seulement ; un clic
ouvre le résumé des parties communes.

**Acceptance Scenarios**:

1. **Given** mon compte de référence analysé et une partie contenant un joueur déjà croisé,
   **When** la card s'affiche, **Then** ce joueur porte le badge `👥 N` et les autres n'en portent
   pas.
2. **Given** la card affichée, **When** je clique sur un joueur, **Then** le panneau « parties
   communes » de la feature 001 s'ouvre pour ce joueur.
3. **Given** aucun compte de référence ou un historique jamais analysé, **When** la card
   s'affiche, **Then** aucun badge n'apparaît et le clic ouvre le panneau avec l'invitation
   correspondante (définir son Riot ID ou lancer l'analyse).
4. **Given** je suis moi-même dans la partie, **When** la card s'affiche, **Then** je suis
   identifié comme tel (« C'est vous ») et aucun badge n'est affiché sur moi.

---

### User Story 3 - Évaluer le niveau des joueurs en classée Solo/Duo (Priority: P3)

Pour chaque joueur de la card, l'utilisateur voit son rang actuel en classée Solo/Duo (palier,
division, points de ligue), son pourcentage de victoires et son nombre de victoires et de
défaites de la saison en cours, pour juger rapidement du niveau de ses alliés et adversaires.

**Why this priority**: forte valeur ajoutée pour préparer la partie, mais non indispensable pour
savoir qui l'on connaît ; la card reste utile sans ces statistiques.

**Independent Test**: afficher la card d'une partie et vérifier, pour chaque joueur, le rang, le
pourcentage de victoires et le nombre de victoires et de défaites.

**Acceptance Scenarios**:

1. **Given** un joueur classé en Solo/Duo, **When** la card s'affiche, **Then** son rang (ex.
   « Platine II · 45 LP ») et ses statistiques (ex. « 54 % · 120 V / 102 D ») apparaissent.
2. **Given** un joueur sans classement Solo/Duo cette saison (placements non terminés), **When**
   la card s'affiche, **Then** la mention « Non classé » apparaît, sans pourcentage.
3. **Given** les statistiques d'un joueur momentanément indisponibles, **When** la card
   s'affiche, **Then** le reste de la card s'affiche normalement et ce joueur indique
   « Statistiques indisponibles ».
4. **Given** la card affichée, **When** les statistiques sont en cours de chargement, **Then** la
   composition des équipes est déjà visible et les statistiques se complètent ensuite.

---

### Edge Cases

- **Partie qui se termine ou commence pendant que la page est ouverte** : rien ne change tant que
  l'utilisateur ne clique pas sur « Actualiser la partie en cours » (FR-001).
- **Clics répétés sur « Actualiser »** : une seule vérification à la fois ; le bouton est inactif
  pendant la vérification.
- **Joueur en partie d'un autre mode** (ARAM, normale, Flex, Arena…) : pas de card, message
  indiquant le mode (FR-003).
- **Joueur non classé en Solo/Duo cette saison** (placements en cours) alors qu'il joue en
  Solo/Duo : « Non classé ».
- **Joueur recherché = compte de référence** : la card affiche sa propre partie ; il est
  identifié comme « C'est vous ».
- **Analyse en cours pendant l'affichage de la card** : les badges reflètent la dernière analyse
  terminée.
- **Clic sur « Actualiser » alors que la card est déjà affichée pour la même partie** : la card
  est mise à jour sur place (même partie, durée et statistiques actualisées).

## Requirements *(mandatory)*

### Functional Requirements

**Vérification et card « Partie en cours »**

- **FR-001**: Sur le profil d'un joueur, le système DOIT proposer un bouton « Actualiser la partie
  en cours » ; la partie en cours n'est vérifiée qu'au clic sur ce bouton, jamais
  automatiquement (ni à l'ouverture du profil, ni à intervalle régulier). Pendant la
  vérification, le bouton DOIT être inactif et indiquer un chargement.
- **FR-002**: Si le joueur est en partie classée Solo/Duo, le système DOIT afficher une card
  « Partie en cours » au-dessus de l'historique, sur toute la largeur du contenu.
- **FR-003**: Si le joueur n'est pas en partie, le système DOIT afficher « Pas de partie classée
  Solo/Duo en cours » ; s'il est en partie dans un autre mode, le système DOIT afficher qu'il est
  en partie mais pas en classée Solo/Duo, en nommant le mode (mêmes libellés français que
  l'historique de la feature 001). Dans ces deux cas, aucune card n'est affichée.
- **FR-004**: La card DOIT afficher la durée écoulée depuis le début de la partie (format
  `mm:ss`), mise à jour automatiquement chaque seconde ; tant que la partie n'a pas commencé
  (écran de chargement), elle DOIT afficher « Écran de chargement ».
- **FR-005**: La card DOIT afficher les deux équipes **entièrement et sans interaction** (aucun
  dépliage), côte à côte sur un écran d'ordinateur, chaque joueur sur sa propre ligne.
- **FR-006**: Pour chaque joueur, la card DOIT afficher son Riot ID et l'icône et le nom de son
  champion. Elle NE DOIT PAS afficher les champions bannis, les sorts d'invocateur ni les runes.
- **FR-007**: Le joueur dont on consulte le profil DOIT être mis en évidence dans la card.
- **FR-008**: L'échec de la vérification DOIT être signalé par un message clair sans empêcher
  l'affichage du profil et de l'historique.

**Joueurs déjà croisés (réutilise la feature 001)**

- **FR-009**: Si le compte de référence est défini et son historique analysé, la card DOIT
  afficher le badge `👥 N` à côté de chaque joueur déjà croisé, et aucun badge pour les autres
  (même règle que la feature 001, FR-010a).
- **FR-010**: Un clic sur un joueur de la card DOIT ouvrir le panneau « parties communes » de la
  feature 001, avec les mêmes comportements (résumé, « Jamais joué ensemble », « C'est vous »,
  invitations à définir son Riot ID ou lancer l'analyse).
- **FR-011**: Chaque joueur de la card DOIT proposer le lien « Voir le profil » de la feature 001.

**Niveau en classée Solo/Duo**

- **FR-012**: Pour chaque joueur, la card DOIT afficher son rang actuel en classée Solo/Duo :
  palier, division (si applicable) et points de ligue (ex. « Platine II · 45 LP »).
- **FR-013**: Pour chaque joueur classé, la card DOIT afficher son pourcentage de victoires en
  classée Solo/Duo de la saison en cours, arrondi à l'unité, avec le nombre de victoires et de
  défaites (ex. « 54 % · 120 V / 102 D »).
- **FR-014**: Un joueur sans classement Solo/Duo cette saison DOIT être indiqué « Non classé ».
- **FR-015**: La composition des équipes DOIT s'afficher sans attendre les statistiques, qui se
  complètent ensuite ; l'indisponibilité des statistiques d'un joueur DOIT être signalée sur ce
  joueur seulement (« Statistiques indisponibles »).

**Conformité**

- **FR-016**: Les statistiques d'un joueur chargées récemment NE DOIVENT PAS être redemandées à
  chaque clic sur « Actualiser » (économie du quota Riot, principe II de la constitution).

### Key Entities *(include if feature involves data)*

- **Partie en cours** : une partie actuellement jouée — mode de jeu, heure de début (absente
  pendant l'écran de chargement), deux équipes.
- **Joueur de la partie en cours** : un participant — identité permanente, Riot ID, champion,
  équipe.
- **Statistiques classées Solo/Duo** : pour un joueur, son rang actuel (palier, division, points
  de ligue), ses victoires et défaites de la saison, ou l'absence de classement.
- **Compte de référence, analyse, parties communes** : inchangés, définis par la feature 001.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Après un clic sur « Actualiser la partie en cours », le résultat (card ou message)
  apparaît en moins de 3 secondes, dans 95 % des cas.
- **SC-002**: Les statistiques des 10 joueurs sont toutes affichées en moins de 5 secondes après
  l'apparition de la card, dans 95 % des cas.
- **SC-003**: L'ouverture du profil et l'affichage de l'historique ne sont pas ralentis par la
  feature (mêmes temps que la feature 001 : moins de 5 secondes).
- **SC-004**: Les badges de la card sont exacts à 100 % par rapport à l'analyse (mêmes nombres que
  dans le panneau « parties communes »).
- **SC-005**: Pendant l'écran de chargement, l'utilisateur identifie les joueurs déjà croisés et
  le niveau de chacun en moins de 30 secondes à partir de sa recherche.
- **SC-006**: Le pourcentage de victoires affiché est exact (victoires ÷ (victoires + défaites),
  arrondi à l'unité) pour 100 % des joueurs classés.

## Assumptions

- Les données de partie en cours et de classement proviennent du service officiel de Riot Games ;
  une partie apparaît dès l'écran de chargement et disparaît à sa fin, avec un léger décalage
  possible.
- L'utilisateur accède à sa propre partie en recherchant son Riot ID (pas d'accès direct dédié).
- Seules les parties classées Solo/Duo affichent une card (toujours 2 équipes de 5 joueurs
  humains).
- Seul le rang **actuel** en Solo/Duo est affiché : le meilleur rang de carrière (saisons
  passées) n'est pas fourni par le service de Riot Games et est hors périmètre.
- La classée Flex, les maîtrises de champion, les statistiques par champion, les bannissements,
  les sorts d'invocateur et les runes sont hors périmètre.
- Les badges reflètent la dernière analyse terminée du compte de référence (aucune analyse
  déclenchée par la card).
- L'application reste locale et mono-utilisateur, comme pour la feature 001.

## Clarifications

### Session 2026-10-20

- Q: Quand vérifier s'il y a une partie en cours ? → A: Uniquement au clic sur « Actualiser la
  partie en cours » (révise une première réponse « à l'ouverture + au clic »).
- Q: Faut-il un accès direct « Ma partie en cours » ? → A: Non ; l'utilisateur recherche son
  propre Riot ID pendant l'écran de chargement.
- Q: Quelles parties affichent la card ? → A: Uniquement les parties classées Solo/Duo ; pour un
  autre mode, un message nomme le mode.
- Q: Quelles informations par joueur ? → A: Riot ID, champion, rang actuel Solo/Duo,
  % de victoires, nombre de victoires et de défaites ; pas de bannissements, sorts ni runes.
  Card grande, deux équipes affichées en entier sans dépliage.
- Q: Le meilleur rang de carrière (non fourni par Riot) ? → A: Rang actuel seulement.
