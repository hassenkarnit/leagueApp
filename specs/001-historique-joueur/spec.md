# Feature Specification: Historique d'un joueur et « a-t-il déjà joué avec moi ? »

**Feature Branch**: `001-historique-joueur`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Je veux pouvoir rechercher un joueur League of Legends avec son Riot ID (Pseudo#TAG) et voir son profil avec l'historique de ses derniers matchs (champion joué, victoire/défaite, KDA, mode de jeu, date). Dans chaque match de l'historique, je vois les 10 participants. Quand je clique sur un participant, je peux voir si ce joueur a déjà joué avec moi (moi = mon propre compte Riot ID) : combien de parties ensemble, dans la même équipe ou contre moi, et les résultats. Le but : savoir rapidement si je connais un joueur que je croise en partie. Si le joueur n'existe pas ou si le service est indisponible, je dois avoir un message clair."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rechercher un joueur et consulter son historique (Priority: P1)

L'utilisateur saisit le Riot ID d'un joueur (ex. `Faker#KR1`) et le serveur sur lequel il
joue. L'application affiche le profil du joueur et la liste de ses derniers matchs, du plus
récent au plus ancien. Pour chaque match, l'utilisateur voit d'un coup d'œil le champion
joué, le résultat (victoire/défaite), le KDA (éliminations / morts / assistances), le mode
de jeu et la date. En dépliant un match, il voit les 10 participants répartis en deux
équipes.

**Why this priority**: c'est le socle de l'application ; sans recherche ni historique, aucune
autre fonctionnalité n'a de sens. Seule, elle apporte déjà de la valeur (consulter les
parties de n'importe quel joueur).

**Independent Test**: rechercher un Riot ID existant et vérifier que le profil et la liste des
matchs s'affichent avec toutes les informations attendues, puis déplier un match et vérifier
la présence des 10 participants.

**Acceptance Scenarios**:

1. **Given** un joueur existant ayant joué récemment, **When** l'utilisateur recherche son
   Riot ID sur le bon serveur, **Then** le profil du joueur s'affiche avec ses derniers
   matchs, chacun montrant champion, résultat, KDA, mode de jeu et date.
2. **Given** l'historique affiché, **When** l'utilisateur déplie un match, **Then** les 10
   participants apparaissent, regroupés par équipe, avec leur Riot ID, leur champion et leur
   KDA.
3. **Given** l'historique affiché, **When** l'utilisateur demande plus de matchs, **Then** les
   matchs plus anciens suivants s'ajoutent à la liste.
4. **Given** un Riot ID qui n'existe pas, **When** l'utilisateur lance la recherche, **Then**
   un message clair indique « Joueur introuvable » et l'invite à vérifier le pseudo, le tag
   et le serveur.
5. **Given** une saisie sans `#` ou sans tag, **When** l'utilisateur valide, **Then** un
   message explique le format attendu (`Pseudo#TAG`) avant toute recherche.
6. **Given** le service de données de Riot indisponible ou surchargé, **When** l'utilisateur
   lance une recherche, **Then** un message indique que le service est momentanément
   indisponible et l'invite à réessayer, sans page blanche ni erreur technique.

---

### User Story 2 - Savoir si un participant a déjà joué avec moi (Priority: P2)

L'utilisateur a indiqué une fois quel est son propre compte (son Riot ID). Lorsqu'il consulte
un match et clique sur l'un des participants, l'application lui indique s'il a déjà joué
avec ce joueur : nombre de parties en commun, combien dans la même équipe et combien en
adversaires, avec les résultats (victoires/défaites de son point de vue) et la date de la
dernière partie commune.

**Why this priority**: c'est l'objectif principal exprimé (« savoir rapidement si je connais
un joueur que je croise en partie »), mais il repose sur la recherche et l'historique de la
User Story 1.

**Independent Test**: avec un compte de référence défini, ouvrir un match dans lequel figure un
joueur avec qui le compte de référence a déjà joué, cliquer sur ce joueur et vérifier que le
résumé des parties communes est exact ; cliquer ensuite sur un joueur inconnu et vérifier le
message « jamais joué ensemble ».

**Acceptance Scenarios**:

1. **Given** mon compte de référence défini et un participant avec qui j'ai déjà joué,
   **When** je clique sur ce participant, **Then** je vois le nombre total de parties
   communes, la répartition « même équipe » / « adversaires », mes victoires et défaites dans
   chaque cas, et la date de la dernière partie commune.
2. **Given** le résumé affiché, **When** je demande le détail, **Then** je vois la liste des
   parties communes (date, mode, champions joués par chacun, résultat pour moi).
3. **Given** un participant avec qui je n'ai jamais joué, **When** je clique dessus, **Then**
   un message indique que nous n'avons jamais joué ensemble sur la période analysée, en
   précisant cette période.
4. **Given** mon compte de référence non défini, **When** je clique sur un participant,
   **Then** l'application m'invite à indiquer mon Riot ID avant de pouvoir répondre.
5. **Given** mon compte de référence défini mais jamais analysé, **When** je clique sur un
   participant, **Then** l'application m'invite à lancer l'analyse via le bouton « Analyser
   mon historique ».
6. **Given** mon compte de référence défini, **When** je clique sur « Analyser mon
   historique », **Then** la progression s'affiche jusqu'à la fin de l'analyse, puis les badges
   et résumés deviennent disponibles.
7. **Given** un match où je figure moi-même, **When** je clique sur mon propre nom, **Then**
   l'application indique « C'est vous » au lieu d'un résumé.
8. **Given** mon compte de référence défini et analysé, **When** je déplie un match, **Then**
   chaque participant avec qui j'ai déjà joué porte, sans clic, une icône et le nombre de
   parties communes (ex. `👥 3`), et les autres participants n'en portent aucune.

---

### User Story 3 - Naviguer vers le profil d'un participant (Priority: P3)

Depuis la liste des participants d'un match, l'utilisateur peut ouvrir directement le profil
et l'historique de n'importe quel participant, sans retaper son Riot ID.

**Why this priority**: confort de navigation qui prolonge naturellement les stories 1 et 2,
mais non indispensable à l'objectif principal.

**Independent Test**: déplier un match, choisir « voir le profil » sur un participant et
vérifier que son profil et son historique s'affichent comme après une recherche manuelle.

**Acceptance Scenarios**:

1. **Given** un match déplié, **When** l'utilisateur choisit d'ouvrir le profil d'un
   participant, **Then** le profil et l'historique de ce participant s'affichent.
2. **Given** le profil d'un participant ouvert depuis un match, **When** l'utilisateur revient
   en arrière, **Then** il retrouve l'historique précédent à l'endroit où il l'avait laissé.

---

### Edge Cases

- **Format de Riot ID invalide** (pas de `#`, tag vide, caractères interdits, longueur
  excessive) : message de format, aucune recherche lancée.
- **Joueur existant mais sans aucun match récent** : le profil s'affiche avec un message
  « Aucune partie récente » au lieu d'une liste vide muette.
- **Joueur ayant changé de pseudo** : il est reconnu comme le même joueur ; les parties
  communes passées sont comptées même si son pseudo était différent à l'époque.
- **Participant non humain** (bots des parties contre l'IA) : il est affiché mais ne peut
  pas faire l'objet d'une vérification « déjà joué avec moi ».
- **Partie annulée** (remake / partie écourtée sans résultat) : affichée comme telle et non
  comptée comme victoire ni défaite.
- **Mon compte de référence introuvable** (Riot ID mal saisi ou modifié) : message clair et
  invitation à le corriger.
- **Quota du service Riot atteint pendant le chargement** : les éléments déjà chargés restent
  affichés et un message indique que la suite arrivera après une courte attente.
- **Recherche du même joueur à quelques secondes d'intervalle** : le résultat est réaffiché
  sans nouvelle attente notable.

## Requirements *(mandatory)*

### Functional Requirements

**Recherche et profil**

- **FR-001**: Les utilisateurs DOIVENT pouvoir rechercher un joueur par son Riot ID au format
  `Pseudo#TAG`.
- **FR-002**: Le système DOIT valider le format du Riot ID avant toute recherche et expliquer
  le format attendu en cas d'erreur.
- **FR-003**: Les utilisateurs DOIVENT pouvoir choisir le serveur du joueur recherché dans une
  liste déroulante proposant tous les serveurs publics de League of Legends (EUW, EUNE, NA,
  KR, BR, etc.) ; EUW est présélectionné par défaut.
- **FR-004**: Le système DOIT afficher le profil du joueur trouvé : Riot ID, icône et niveau
  d'invocateur.

**Historique de matchs**

- **FR-005**: Le système DOIT afficher les 20 derniers matchs du joueur, du plus récent au plus
  ancien, tous modes de jeu confondus.
- **FR-006**: Pour chaque match, le système DOIT afficher : champion joué, résultat
  (victoire / défaite / partie annulée), KDA, mode de jeu, date et durée de la partie.
- **FR-007**: Les utilisateurs DOIVENT pouvoir charger les 20 matchs plus anciens suivants, de
  manière répétée.
- **FR-008**: Pour chaque match, les utilisateurs DOIVENT pouvoir afficher les 10 participants
  regroupés par équipe, avec leur Riot ID, leur champion, leur KDA, et le résultat de chaque
  équipe.

**« A-t-il déjà joué avec moi ? »**

- **FR-009**: Les utilisateurs DOIVENT pouvoir définir leur compte de référence (« moi ») en
  saisissant une fois son Riot ID et son serveur ; ce choix est mémorisé sur l'appareil de
  l'utilisateur, reste actif d'une visite à l'autre et peut être modifié ou effacé à tout
  moment. Aucune connexion à un compte Riot n'est requise.
- **FR-010**: En cliquant sur un participant, les utilisateurs DOIVENT voir un résumé des
  parties communes avec leur compte de référence : nombre total, nombre dans la même équipe
  et nombre en adversaires, victoires et défaites (du point de vue du compte de référence)
  pour chacune de ces deux catégories, et date de la dernière partie commune.
- **FR-010a**: Dans la liste des participants d'un match, le système DOIT afficher
  automatiquement, sans clic, à côté de chaque joueur déjà croisé par le compte de référence,
  une icône accompagnée du nombre de parties communes (ex. `👥 3`) ; aucun indicateur n'est
  affiché pour un joueur jamais croisé. Le clic sur le joueur ouvre le résumé détaillé
  (FR-010).
- **FR-011**: Les utilisateurs DOIVENT pouvoir consulter la liste détaillée des parties
  communes (date, mode, champion de chacun, résultat pour le compte de référence).
- **FR-012**: La recherche de parties communes DOIT porter sur les 100 dernières parties du
  compte de référence, et le résultat DOIT toujours préciser la période effectivement analysée
  (nombre de parties et date de la plus ancienne).
- **FR-012a**: L'analyse de l'historique du compte de référence DOIT être lancée uniquement
  par l'utilisateur, via un bouton « Analyser mon historique » ; elle n'est jamais déclenchée
  automatiquement. Pendant l'analyse, le système DOIT afficher la progression
  (ex. « 37 / 100 parties analysées »). Lors d'une nouvelle analyse, les parties déjà
  analysées NE DOIVENT PAS être réanalysées, seules les nouvelles parties le sont.
- **FR-012b**: Le système DOIT afficher la date de la dernière analyse (ex. « Dernière analyse :
  il y a 2 jours ») afin que l'utilisateur sache si les résultats sont à jour.
- **FR-013**: Si aucune partie commune n'est trouvée, le système DOIT l'indiquer explicitement
  en rappelant la période analysée.
- **FR-014**: Le système DOIT reconnaître les joueurs par leur identité permanente et non par
  leur pseudo, afin qu'un changement de pseudo n'empêche pas de retrouver les parties
  communes.
- **FR-015**: Si le participant cliqué est le compte de référence lui-même, le système DOIT
  indiquer « C'est vous ».
- **FR-016**: Si le compte de référence n'est pas défini, ou si son historique n'a encore
  jamais été analysé, le système DOIT inviter l'utilisateur à le définir ou à lancer l'analyse
  avant d'afficher un résumé ; aucun badge (FR-010a) n'est affiché dans ce cas.

**Navigation**

- **FR-017**: Les utilisateurs DOIVENT pouvoir ouvrir le profil et l'historique de n'importe
  quel participant humain d'un match en un clic.

**Erreurs, attente et conformité**

- **FR-018**: Le système DOIT afficher un message clair et compréhensible pour chacun de ces
  cas : format invalide, joueur introuvable, aucune partie récente, compte de référence non
  défini ou introuvable, service Riot indisponible, quota temporairement atteint.
- **FR-019**: Le système DOIT afficher un indicateur de chargement pendant toute attente
  perceptible et conserver à l'écran les informations déjà chargées en cas d'erreur
  partielle.
- **FR-020**: Le système DOIT afficher sur toutes les pages la mention légale exigée par Riot
  Games indiquant que l'application n'est ni approuvée ni soutenue par Riot Games.

### Key Entities *(include if feature involves data)*

- **Joueur** : une personne identifiée de façon permanente, avec son Riot ID actuel
  (`Pseudo#TAG`), son serveur, son icône et son niveau. Un Riot ID peut changer, l'identité
  permanente non.
- **Match** : une partie terminée, avec son mode de jeu, sa date, sa durée, ses deux équipes
  et le résultat de chacune.
- **Participation** : la présence d'un joueur dans un match — équipe, champion joué, KDA,
  résultat. Un match contient 10 participations.
- **Compte de référence (« moi »)** : le joueur considéré comme l'utilisateur de
  l'application, servant de base à la recherche de parties communes.
- **Historique commun** : pour un couple (compte de référence, autre joueur), l'ensemble des
  matchs où les deux ont participé, avec le décompte même équipe / adversaires, les
  résultats, la date de la dernière partie et la période analysée.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utilisateur trouve le profil et les 20 derniers matchs d'un joueur en moins de
  5 secondes après avoir validé sa recherche, dans 95 % des cas.
- **SC-002**: Un profil déjà consulté dans les 5 dernières minutes se réaffiche en moins d'une
  seconde.
- **SC-003**: Après un clic sur un participant, l'utilisateur sait s'il a déjà joué avec lui en
  moins de 5 secondes une fois l'historique du compte de référence analysé ; la première
  analyse des 100 dernières parties se termine en moins de 3 minutes.
- **SC-004**: Le décompte des parties communes est exact à 100 % sur la période analysée
  (aucune partie commune oubliée ni comptée en double).
- **SC-005**: 100 % des erreurs prévues (FR-018) produisent un message compréhensible ; aucune
  situation ne laisse l'utilisateur face à une page blanche ou à un message technique.
- **SC-006**: Un nouvel utilisateur parvient à répondre à « ai-je déjà joué avec ce joueur ? »
  pour un participant d'un match, sans aide, du premier coup.

## Assumptions

- L'application est utilisée par une seule personne (son créateur), en local sur son
  ordinateur, via son navigateur ; la mise en ligne (accès par d'autres personnes, hébergement)
  est hors périmètre de cette fonctionnalité.
- Les données proviennent exclusivement du service de données officiel de Riot Games, avec
  les limites de fréquence et de profondeur d'historique qu'il impose ; certaines parties très
  anciennes peuvent ne pas être disponibles.
- Tous les modes de jeu sont inclus dans l'historique et dans la recherche de parties
  communes ; le filtrage par mode est hors périmètre pour cette fonctionnalité.
- Le rang classé, les statistiques par champion, les objets et le détail avancé d'une partie
  (dégâts, or, etc.) sont hors périmètre de cette fonctionnalité et feront l'objet de
  fonctionnalités ultérieures.
- L'application est en français et utilisée sur ordinateur ; l'affichage mobile doit rester
  lisible mais n'est pas optimisé dans cette version.
- Les parties en cours (live) ne sont pas affichées ; seules les parties terminées le sont.
- Le compte de référence est mémorisé uniquement sur l'appareil de l'utilisateur : en changeant
  d'appareil ou de navigateur, il faut le saisir à nouveau.
- Une partie commune plus ancienne que les 100 dernières parties du compte de référence n'est
  pas détectée ; c'est un compromis accepté entre exhaustivité et temps d'attente.

## Clarifications

### Session 2026-10-20

- Q: Comment l'application retient-elle « moi » ? → A: Riot ID saisi une fois et mémorisé sur
  l'appareil (pas de connexion Riot).
- Q: Quelle profondeur d'historique analyser pour les parties communes ? → A: Les 100 dernières
  parties du compte de référence.
- Q: Quels serveurs prendre en charge ? → A: Tous les serveurs, choisis dans une liste
  déroulante (EUW par défaut).
- Q: Qui pourra utiliser l'application, et d'où ? → A: Uniquement le créateur, en local sur son
  ordinateur (pas de mise en ligne).
- Q: Faut-il signaler automatiquement, sans clic, les joueurs déjà croisés dans un match ?
  → A: Oui, icône + nombre de parties communes (ex. `👥 3`) ; le clic ouvre le détail.
- Q: À quel moment analyser les 100 dernières parties du compte de référence ? → A: Uniquement
  quand l'utilisateur clique sur un bouton « Analyser mon historique ».
