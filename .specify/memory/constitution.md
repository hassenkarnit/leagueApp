# LeagueApp Constitution

Application web de suivi de joueurs League of Legends basée sur l'API Riot Games.

## Core Principles

### I. Sécurité des secrets (NON NÉGOCIABLE)

- La clé API Riot DOIT être lue uniquement côté serveur, depuis une variable d'environnement.
- La clé NE DOIT JAMAIS être envoyée au navigateur : aucun appel direct du front-end vers
  l'API Riot ; le front-end passe toujours par le back-end de l'application.
- La clé NE DOIT JAMAIS être commitée : `.env` est ignoré par git, seul un `.env.example`
  sans valeur réelle est versionné.
- La clé NE DOIT JAMAIS apparaître dans les logs, les messages d'erreur ni les réponses HTTP.

**Pourquoi** : une clé exposée peut être utilisée par n'importe qui, épuiser nos quotas et
entraîner la révocation de notre accès par Riot.

### II. Respect de l'API Riot

- Chaque appel à l'API Riot DOIT passer par un client unique qui gère les rate limits :
  respect des en-têtes de limite renvoyés par Riot et, sur une réponse `429`, attente de la
  durée indiquée par `Retry-After` avant toute nouvelle tentative.
- Les réponses DOIVENT être mises en cache selon leur nature : les données immuables
  (détail d'un match terminé) longtemps, les données changeantes (rang, liste des derniers
  matchs) brièvement.
- L'application NE DOIT PAS appeler l'API plus que nécessaire (pas de polling agressif,
  pas de requêtes en boucle non bornées).
- L'application DOIT respecter les politiques développeur Riot (General Policies, conditions
  d'utilisation de l'API).

**Pourquoi** : les quotas Riot sont stricts ; les dépasser rend l'application inutilisable et
peut entraîner un bannissement de la clé.

### III. Tests d'abord (NON NÉGOCIABLE)

- Toute fonctionnalité commence par des tests qui échouent, puis le code minimal qui les fait
  passer, puis le refactoring (cycle Red → Green → Refactor).
- L'API Riot DOIT être simulée (mock / fixtures) dans les tests automatisés : aucun test ne
  dépend du réseau ni d'une vraie clé.
- Les cas d'erreur (joueur introuvable, 429, API indisponible) DOIVENT être couverts par des
  tests, pas seulement le cas nominal.
- Une branche NE DOIT PAS être fusionnée si un test échoue.

**Pourquoi** : les tests écrits d'abord prouvent que la spec est respectée et permettent de
modifier le code sans peur ; les mocks rendent les tests rapides, gratuits et reproductibles.

### IV. Simplicité (YAGNI)

- On implémente le minimum qui satisfait la spec en cours, pas les besoins hypothétiques.
- Pas de nouvelle couche d'abstraction, de nouveau service ni de nouvelle dépendance sans un
  besoin concret présent dans une spec.
- Toute complexité supplémentaire DOIT être justifiée dans la section « Complexity Tracking »
  du plan de la feature.

**Pourquoi** : un projet simple reste compréhensible, surtout en apprentissage ; la complexité
inutile ralentit chaque feature suivante.

### V. Spec avant code

- Aucune fonctionnalité n'est codée sans spec validée (`spec.md`), plan (`plan.md`) et liste de
  tâches (`tasks.md`) dans `specs/<NNN-nom-feature>/`.
- Chaque feature a sa propre branche git `NNN-nom-feature`, créée depuis `main`.
- Si le comportement attendu change, la spec est mise à jour d'abord, le code ensuite.
- La spec décrit le **quoi** et le **pourquoi** ; les choix techniques vivent dans le plan.

**Pourquoi** : la spec est la source de vérité ; elle évite de coder la mauvaise chose et garde
une trace des décisions.

### VI. Code typé, lisible et erreurs explicites

- Le code DOIT être statiquement typé (pas de type « any » / non typé sans justification).
- Les noms DOIVENT être explicites ; les fonctions courtes et à responsabilité unique.
- Chaque erreur prévisible DOIT produire un message clair et compréhensible pour l'utilisateur
  (ex. « Joueur introuvable », « Service Riot momentanément indisponible, réessayez »), jamais
  une page blanche ni une erreur technique brute.
- Les données reçues de l'API Riot DOIVENT être validées à la frontière (le format externe
  n'est jamais supposé correct).

**Pourquoi** : le typage attrape les bugs avant l'exécution ; des erreurs explicites rendent
l'application fiable aux yeux de l'utilisateur.

## Contraintes de la plateforme Riot

- **Identification des joueurs** : un joueur est recherché par son Riot ID (`gameName#tagLine`)
  et identifié en interne par son PUUID ; le PUUID est la clé de référence stable.
- **Routage** : les appels DOIVENT utiliser le bon routage (régional pour account/match,
  plateforme pour les données liées au serveur) ; le serveur/région est explicite, jamais deviné.
- **Clé de développement** : elle expire toutes les 24 h ; l'application DOIT détecter une clé
  invalide/expirée (401/403) et l'afficher clairement côté serveur, sans planter.
- **Données statiques** (champions, objets, icônes) : récupérées via Data Dragon / Community
  Dragon, mises en cache, et non via l'API à quota.
- **Mention légale** : l'interface DOIT afficher la mention exigée par Riot indiquant que
  l'application n'est ni approuvée ni soutenue par Riot Games.
- **Données personnelles** : seules les données nécessaires aux fonctionnalités spécifiées sont
  stockées ; pas de revente ni d'exploitation hors du cadre de l'application.

## Workflow de développement

1. `/speckit-specify` → spec de la feature (branche `NNN-nom-feature` créée automatiquement).
2. `/speckit-clarify` → levée des ambiguïtés (recommandé avant tout plan).
3. `/speckit-plan` → plan technique, avec vérification de conformité à cette constitution.
4. `/speckit-tasks` → tâches ordonnées, tests en premier.
5. `/speckit-analyze` → contrôle de cohérence spec / plan / tâches (recommandé).
6. `/speckit-implement` → implémentation tâche par tâche.

**Quality gates avant fusion dans `main`** :
- tous les tests passent ;
- la vérification de types et le linter passent sans erreur ;
- chaque exigence de la spec (FR-xxx) est couverte par au moins un test ;
- aucun secret dans le diff.

**Commits** : petits, fréquents, au format Conventional Commits (`feat:`, `fix:`, `test:`,
`docs:`, `chore:`, `refactor:`).

## Governance

- Cette constitution prévaut sur toute autre pratique du projet. En cas de conflit entre une
  spec/un plan et la constitution, c'est la constitution qui s'applique — ou elle est amendée
  explicitement.
- **Amendement** : via `/speckit-constitution`, avec un Sync Impact Report et un commit dédié
  `docs: amend constitution to vX.Y.Z (...)`.
- **Versionnement (SemVer)** :
  - MAJOR : suppression ou redéfinition incompatible d'un principe ;
  - MINOR : ajout d'un principe/d'une section ou extension significative ;
  - PATCH : clarification, reformulation, correction de coquille.
- **Conformité** : chaque `plan.md` contient une « Constitution Check » qui DOIT passer avant
  l'implémentation ; toute dérogation est justifiée dans « Complexity Tracking ».
- **Revue** : avant chaque fusion, on vérifie le respect des principes I à VI.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
