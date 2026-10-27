# Feature Specification: Remplissage progressif de l'historique

**Feature Branch**: `004-remplissage-historique`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Remplissage progressif de l'historique de matchs en arrière-plan pour le compte de référence uniquement (les autres joueurs restent chargés à la demande). On commence par les matchs les plus récents et on remonte dans le temps ; chaque détail de match terminé est stocké une seule fois et jamais rechargé. Le remplissage utilise le quota Riot restant par fenêtre de 2 minutes. Les appels live (partie en cours + rangs) ont toujours la priorité, et une RÉSERVE de quota est gardée en permanence pour pouvoir actualiser le live à tout moment : budget du remplissage = limite réelle de Riot moins la réserve live (valeur par défaut basée sur le coût d'une actualisation live, réglable). Le remplissage s'arrête sur un 429 et respecte les en-têtes de limite de Riot ; il n'avance que quand le serveur local tourne. Rangs : on enregistre le rang des joueurs au moment où on les voit (parties live) pour garder un vrai « rang à l'époque » ; pour les matchs récupérés après coup, on affiche le rang actuel, clairement indiqué comme tel. Les améliorations de la feature 003 (emblèmes de rang, winrate coloré, rang moyen par équipe) s'appliquent aussi aux parties passées."

**Depends on**: feature `001-historique-joueur` (compte de référence, historique et détail des
matchs), feature `002-live-game-card` (actualisation de la partie en cours, rangs Solo/Duo) et
feature `003-rangs-logos-winrate-moyenne` (emblèmes, winrate coloré, rang moyen par équipe).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Avoir un historique qui se complète tout seul sans gêner le live (Priority: P1)

L'utilisateur lance l'application. Pendant qu'il l'utilise, l'application récupère en arrière-plan
les parties du compte de référence, en commençant par les plus récentes puis en remontant dans le
temps. À chaque fenêtre de 2 minutes, elle n'utilise que le quota Riot qui reste après avoir mis de
côté une **réserve** pour le live. Si l'utilisateur clique sur « Actualiser la partie en cours »,
l'appel passe immédiatement, même au milieu d'un remplissage : le live a toujours la priorité.
Chaque match terminé n'est récupéré qu'une seule fois puis conservé.

**Why this priority**: c'est le cœur de la feature : un historique complet sans effort, et sans
jamais rendre le live inutilisable. Les deux vont ensemble : un remplissage qui épuise le quota
rendrait l'application inutilisable pendant l'écran de chargement.

**Independent Test**: laisser tourner l'application avec un compte de référence ayant plus de
matchs que le quota d'une fenêtre ; vérifier que le nombre de matchs stockés augmente d'une fenêtre à
l'autre, du plus récent au plus ancien ; déclencher une actualisation live en plein remplissage et
vérifier qu'elle aboutit ; redémarrer l'application et vérifier qu'aucun match déjà stocké n'est
récupéré une seconde fois.

**Acceptance Scenarios**:

1. **Given** un compte de référence dont l'historique est vide, **When** l'application tourne
   pendant plusieurs fenêtres de 2 minutes, **Then** les matchs sont stockés du plus récent au plus
   ancien, un nombre limité par fenêtre.
2. **Given** un remplissage en cours, **When** l'utilisateur clique sur « Actualiser la partie en
   cours », **Then** l'actualisation aboutit sans attendre la fin de la fenêtre, quel que soit
   l'avancement du remplissage.
3. **Given** une fenêtre de 2 minutes, **When** le remplissage a consommé son budget (limite de Riot
   moins la réserve live), **Then** il s'arrête jusqu'à la fenêtre suivante, et la réserve reste
   intacte.
4. **Given** un match déjà stocké, **When** le remplissage ou l'utilisateur le demande à nouveau,
   **Then** il est lu depuis le stockage, sans nouvel appel à Riot.
5. **Given** une réponse de Riot demandant d'attendre (limite atteinte), **When** elle survient
   pendant le remplissage, **Then** le remplissage s'arrête immédiatement et ne reprend qu'après le
   délai indiqué.
6. **Given** l'application arrêtée puis relancée, **When** le remplissage redémarre, **Then** il
   reprend là où il s'était arrêté, sans repartir de zéro.
7. **Given** le compte de référence dont tous les matchs disponibles sont déjà stockés, **When** le
   remplissage tourne, **Then** il ne fait que chercher les nouveaux matchs terminés depuis la
   dernière fois.

---

### User Story 2 - Voir les améliorations de la 003 sur les parties passées (Priority: P2)

Dans le détail d'une partie passée du compte de référence, l'utilisateur retrouve ce qu'il voit dans
la card « Partie en cours » : l'emblème de rang de chacun des 10 joueurs, le winrate coloré et le
rang moyen de chaque équipe. Chaque rang affiché dit clairement de quel rang il s'agit :
« au moment de la partie » quand l'application a vu ce joueur en live pendant cette partie, ou
« actuel » quand le rang vient d'une consultation faite après coup.

**Why this priority**: c'est la valeur visible de l'historique, mais elle suppose que les matchs
soient déjà stockés (User Story 1).

**Independent Test**: ouvrir deux parties passées, l'une observée en live par l'application et
l'autre récupérée après coup ; vérifier que la première affiche des rangs « au moment de la
partie » et la seconde des rangs « actuels », chacune avec emblèmes, winrate coloré et rang moyen par
équipe.

**Acceptance Scenarios**:

1. **Given** une partie que l'application a observée en live, **When** l'utilisateur ouvre ses
   détails plus tard, **Then** les rangs affichés sont ceux enregistrés pendant la partie, avec la
   mention « au moment de la partie ».
2. **Given** une partie récupérée après coup, **When** l'utilisateur ouvre ses détails, **Then** les
   rangs affichés sont les rangs actuels des joueurs, avec la mention « actuel », bien visible.
3. **Given** une partie passée affichée, **When** la page s'affiche, **Then** chaque joueur porte
   l'emblème de son palier, son winrate est coloré et chaque équipe a son rang moyen, avec les mêmes
   règles que dans la feature 003 (non classés ignorés, « N/5 joueurs classés »).
4. **Given** une partie passée dont les rangs actuels ne sont pas encore connus, **When** l'utilisateur
   l'ouvre, **Then** l'application les demande à ce moment-là, une seule fois, puis les conserve ; elle
   ne les demande jamais pour toute la liste d'un coup.
5. **Given** un joueur masqué (identité cachée) dans une partie passée, **When** les rangs s'affichent,
   **Then** il est traité comme dans la feature 003 (non classé, ignoré dans la moyenne) et aucun
   faux rang n'est affiché.

---

### User Story 3 - Savoir où en est le remplissage (Priority: P3)

Un petit indicateur discret montre l'avancement du remplissage : nombre de matchs stockés, date du
plus ancien match récupéré, et état (en cours, en pause, terminé). Si le remplissage est en pause
parce que la clé Riot est expirée ou que la limite est atteinte, l'indicateur le dit.

**Why this priority**: confort. L'historique fonctionne sans, mais l'utilisateur doit pouvoir
comprendre pourquoi il lui manque des matchs.

**Independent Test**: lancer un remplissage et vérifier que l'indicateur affiche un nombre de matchs
qui augmente ; simuler une clé expirée et vérifier que l'indicateur passe à « en pause » avec la
raison.

**Acceptance Scenarios**:

1. **Given** un remplissage en cours, **When** l'utilisateur regarde l'indicateur, **Then** il voit le
   nombre de matchs stockés et la date du plus ancien.
2. **Given** une clé Riot expirée, **When** le remplissage tente de continuer, **Then** il se met en
   pause, et l'indicateur affiche que la clé doit être renouvelée.
3. **Given** tous les matchs disponibles stockés, **When** l'utilisateur regarde l'indicateur, **Then**
   il voit « Historique complet ».

---

### Edge Cases

- Le compte de référence n'a aucun match : le remplissage se termine tout de suite sans erreur.
- Un match est indisponible chez Riot (réponse « introuvable » ou « refusée » sur un seul match) : il
  est ignoré et marqué comme indisponible, il ne bloque pas les suivants et n'est pas redemandé en
  boucle ; ce n'est pas traité comme une clé invalide.
- La clé Riot est expirée ou invalide : le remplissage se met en pause sans planter, et reprend quand
  la clé est valide.
- L'utilisateur actualise le live plusieurs fois de suite : la réserve couvre les actualisations ; si
  elle est vide, l'utilisateur voit un message clair, et le remplissage ne reprend pas de quota sur la
  réserve.
- Le serveur est arrêté en plein remplissage : aucun match à moitié écrit n'est conservé ; au
  redémarrage, le remplissage reprend sans doublon.
- Le fichier de stockage est absent ou illisible : l'application redémarre un remplissage à vide et
  n'efface rien d'autre.
- Le compte de référence change : le remplissage suit le nouveau compte, et les matchs déjà stockés de
  l'ancien compte ne sont pas supprimés.
- Une partie observée en live est abandonnée (remake, déconnexion) : aucun rang n'est associé à un match
  qui n'existe pas.
- Deux actualisations live pour la même partie : le rang enregistré pour un joueur dans une partie n'est
  conservé qu'une fois (le premier).
- Aucun rang n'a été enregistré pour un joueur d'une partie observée (rang indisponible à ce moment-là) :
  il est traité comme « non classé » et le rang actuel n'est pas présenté comme celui de l'époque.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST récupérer en arrière-plan l'historique de matchs du compte de référence
  uniquement ; les autres joueurs restent chargés à la demande, sans remplissage automatique.
- **FR-002**: Le système MUST récupérer les matchs du plus récent au plus ancien.
- **FR-003**: Le système MUST stocker chaque match terminé une seule fois et MUST NOT le redemander à
  Riot une fois stocké.
- **FR-004**: Le système MUST limiter le remplissage à un budget par fenêtre de 2 minutes égal à la
  limite réelle de Riot moins une réserve dédiée au live.
- **FR-005**: Le système MUST garder la réserve live intacte en permanence : le remplissage ne
  l'utilise jamais, même s'il est en retard.
- **FR-006**: La valeur de la réserve live MUST avoir une valeur par défaut tirée du coût d'une
  actualisation live (partie en cours + rangs des joueurs) et MUST être réglable sans modifier le
  code.
- **FR-007**: Les appels live MUST toujours passer avant les appels de remplissage ; le remplissage
  MUST céder la place dès qu'une actualisation live est demandée.
- **FR-008**: Le système MUST respecter les informations de limite renvoyées par Riot et MUST arrêter
  le remplissage dès qu'une réponse lui demande d'attendre, jusqu'à la fin du délai indiqué.
- **FR-009**: Le remplissage MUST ne progresser que lorsque l'application tourne ; il MUST reprendre à
  son dernier point d'avancement après un redémarrage.
- **FR-010**: Le système MUST persister les matchs stockés et l'avancement du remplissage de façon à
  survivre à un redémarrage, sans corrompre les données si l'arrêt a lieu en cours d'écriture.
- **FR-011**: Un match indisponible chez Riot MUST être ignoré et mémorisé comme tel, sans bloquer le
  remplissage et sans être redemandé en boucle.
- **FR-012**: Une clé Riot invalide ou expirée MUST mettre le remplissage en pause avec une raison
  lisible, sans faire planter l'application.
- **FR-013**: Le système MUST enregistrer, pour chaque joueur d'une partie observée en live, son rang au
  moment où il est vu, et MUST relier cet enregistrement à la partie correspondante.
- **FR-014**: Le détail d'une partie passée MUST afficher, pour chacun des 10 joueurs, l'emblème de rang,
  le winrate coloré et, pour chaque équipe, le rang moyen, avec les règles de la feature 003.
- **FR-015**: Chaque rang affiché sur une partie passée MUST indiquer sa nature : « au moment de la
  partie » (rang enregistré en live) ou « actuel » (rang consulté après coup). Un rang actuel MUST NOT
  être présenté comme le rang de l'époque.
- **FR-016**: Les rangs actuels d'une partie passée MUST être demandés à l'ouverture de cette partie,
  pas pour toute la liste, puis conservés ; ils ne MUST pas être redemandés à chaque affichage.
- **FR-017**: Le système MUST afficher un indicateur d'avancement du remplissage (nombre de matchs
  stockés, date du plus ancien, état : en cours, en pause avec raison, ou historique complet).
- **FR-018**: Le remplissage MUST rester borné : pas de requêtes en boucle sans limite, pas de reprise
  agressive après une erreur.
- **FR-019**: Le système MUST NOT exposer la clé Riot dans le stockage, les logs, l'indicateur ni les
  messages d'erreur.
- **FR-020**: Le système MUST conserver uniquement les données nécessaires à l'historique et aux rangs
  décrits ci-dessus (principe de minimisation des données de la constitution).

### Key Entities *(include if feature involves data)*

- **Match stocké**: détail d'un match terminé du compte de référence, récupéré une seule fois ;
  identifié de façon stable, avec ses 10 participants.
- **Avancement du remplissage**: état du remplissage pour le compte de référence : matchs déjà
  stockés, matchs marqués indisponibles, point de reprise vers le passé, date du plus ancien match,
  état courant (en cours, en pause avec raison, complet).
- **Budget de fenêtre**: quota disponible pour le remplissage dans la fenêtre de 2 minutes en cours :
  limite de Riot moins la réserve live, et ce qui a déjà été consommé.
- **Réserve live**: part du quota réservée aux actualisations live, jamais utilisée par le
  remplissage ; valeur par défaut issue du coût d'une actualisation live, réglable.
- **Instantané de rang**: rang d'un joueur (palier, division, points, victoires, défaites) enregistré
  au moment où il est vu dans une partie live, relié à cette partie et à ce joueur.
- **Rang d'une partie passée**: rang affiché pour un joueur dans une partie passée, avec sa nature :
  « au moment de la partie » (instantané) ou « actuel » (consultation après coup).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pendant un remplissage, 100 % des actualisations live de l'utilisateur aboutissent,
  y compris en cas d'actualisations répétées, tant que la réserve n'est pas épuisée par ces
  actualisations elles-mêmes.
- **SC-002**: Le remplissage ne consomme jamais plus que son budget par fenêtre de 2 minutes : la
  réserve live reste intacte dans 100 % des fenêtres observées.
- **SC-003**: 0 match stocké n'est redemandé à Riot : après un redémarrage de l'application, le nombre
  d'appels pour des matchs déjà stockés est nul.
- **SC-004**: Après un redémarrage, le remplissage reprend à son point d'avancement : aucun match
  stocké n'est perdu ni dupliqué.
- **SC-005**: Les matchs sont stockés du plus récent au plus ancien : à tout moment, tous les matchs
  plus récents que le dernier match stocké sont déjà présents.
- **SC-006**: 100 % des parties passées affichées portent l'emblème de rang, le winrate coloré et le
  rang moyen par équipe, et 100 % des rangs affichés indiquent s'ils sont « au moment de la partie »
  ou « actuels ».
- **SC-007**: Pour 100 % des parties observées en live puis ouvertes plus tard, les rangs affichés sont
  ceux enregistrés pendant la partie.
- **SC-008**: Ouvrir une partie passée ne déclenche que les demandes de rangs de cette partie, jamais
  celles de tout l'historique.
- **SC-009**: Quand la limite de Riot est atteinte ou la clé expirée, le remplissage s'arrête en moins
  d'une réponse de Riot et l'utilisateur voit la raison dans l'indicateur.

## Assumptions

- Le compte de référence est celui défini dans la feature 001 ; il n'y en a qu'un à la fois.
- La clé de développement Riot est limitée à 100 requêtes par fenêtre de 2 minutes et 20 par seconde ;
  la valeur exacte à utiliser est lue dans les informations de limite que Riot renvoie, et ces chiffres
  ne sont qu'un ordre de grandeur de départ à vérifier au moment du plan.
- Le coût d'une actualisation live est d'environ une dizaine d'appels (la partie en cours et le rang des
  joueurs) ; le nombre exact sera mesuré dans le code lors du plan, et la réserve par défaut sera
  dimensionnée dessus, avec une marge pour plusieurs actualisations d'affilée.
- L'application est locale : le remplissage ne progresse que quand le serveur tourne ; aucun service
  externe ni tâche planifiée hors de l'application n'est ajouté.
- Le stockage persistant reste local, sur le disque de l'utilisateur, comme les analyses de la
  feature 001 (les données existantes ne sont ni supprimées ni modifiées).
- Les matchs récupérés après coup n'ont pas de rang de l'époque ; l'API de Riot ne le fournit pas et
  aucune estimation n'est faite : seul le rang actuel est proposé, et il est étiqueté comme tel.
- La profondeur maximale de remontée dans le temps est celle que Riot accepte de fournir ; aucune
  limite de nombre de matchs n'est imposée par l'application dans cette version.
- L'indicateur d'avancement est volontairement minimal (compteur, date, état) ; aucun réglage
  d'interface (pause manuelle, priorités) n'est inclus dans cette version.
- Les règles d'affichage des rangs sont celles de la feature 003 et ne sont pas redéfinies ici.
