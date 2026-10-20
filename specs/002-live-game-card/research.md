# Research: Card « Partie en cours » (classée Solo/Duo)

**Phase 0** du plan. Faits vérifiés le 2026-10-20 **par des appels réels** à l'API Riot avec la clé
de développement du projet (aucune valeur de clé affichée ni stockée), complétés par la recherche de
la feature 001 ([../001-historique-joueur/research.md](../001-historique-joueur/research.md)).

---

## R1. Détection de la partie en cours (spectator-v5)

- **Endpoint** : `GET /lol/spectator/v5/active-games/by-summoner/{puuid}` sur l'hôte **plateforme**
  (`kr.api.riotgames.com`, `euw1.api.riotgames.com`…).
- **Vérifié** :
  - joueur en partie → **200** ; joueur hors partie → **404** avec un corps différent des autres
    endpoints : `{"httpStatus":404,"errorCode":"NOT_FOUND",…}` ;
  - PUUID invalide → 400 ;
  - `featured-games` → **403** avec une clé de développement (non utilisé, pas nécessaire).
- **Champs utiles d'une partie** (relevés sur une vraie partie classée) : `gameId`,
  `gameQueueConfigId` (420 = Solo/Duo), `gameMode`, `gameStartTime` (epoch **ms**), `gameLength`
  (secondes), `participants[]` ; autres champs présents mais non utilisés : `bannedChampions`,
  `observers`, `mapId`, `platformId`.
- **Champs utiles d'un participant** : `puuid`, `riotId` (**une seule chaîne** `"Pseudo#TAG"`),
  `championId` (**numéro**), `teamId` (100/200), `bot`. Non utilisés (hors périmètre) : `perks`,
  `spell1Id`, `spell2Id`, `profileIconId`, `lastSelectedSkinIndex`, `gameCustomizationObjects`.
- **Joueurs masqués (découvert lors de l'essai réel du 2026-10-20)** : certains participants ont
  `puuid: null` et un `riotId` remplacé par le **nom de leur champion** (ex. `"Corki"`, sans `#`).
  Un schéma qui exige `puuid` rejette toute la partie → la card ne s'affichait pas (503). Ces
  joueurs sont désormais acceptés et marqués `isHidden`.
- **Décision** : nouvelle méthode `getActiveGame(puuid, platform)` du client Riot unique, qui
  renvoie `null` sur 404 (« pas en partie » n'est pas une erreur), avec validation zod.
- **Alternatives** : appeler l'endpoint depuis le navigateur (rejeté : principe I).

## R2. Écran de chargement

- **Constat (non vérifiable sans partie en chargement au moment du test)** : la communauté indique
  `gameStartTime = 0` tant que la partie n'a pas démarré.
- **Décision** : `gameStartTime <= 0` → `startedAt: null` → la card affiche « Écran de chargement ».
  Sinon, durée = maintenant − `gameStartTime` (plus précis que `gameLength`, figé à l'instant de
  la requête), recalculée chaque seconde côté navigateur.

## R3. Classement Solo/Duo (league-v4)

- **Endpoint** : `GET /lol/league/v4/entries/by-puuid/{puuid}` (hôte plateforme) → tableau
  d'entrées, une par file classée.
- **Vérifié** (exemple réel) : entrée `queueType: "RANKED_SOLO_5x5"` avec `tier` (`CHALLENGER`),
  `rank` (`I`), `leaguePoints` (2256), `wins` (448), `losses` (371), et `freshBlood`, `hotStreak`,
  `inactive`, `veteran` (non utilisés). Pas d'entrée Solo/Duo → joueur **non classé**.
- **Meilleur rang de carrière** : **aucun endpoint** ne le fournit (seule la saison en cours) —
  confirme la clarification de la spec (hors périmètre).
- **Décision** : méthode `getLeagueEntries(puuid, platform)` ; on ne garde que `RANKED_SOLO_5x5`.
  Pourcentage = `round(wins / (wins + losses) × 100)`.
- **Libellés français des paliers** : IRON Fer · BRONZE Bronze · SILVER Argent · GOLD Or ·
  PLATINUM Platine · EMERALD Émeraude · DIAMOND Diamant · MASTER Maître · GRANDMASTER
  Grand Maître · CHALLENGER Challenger. Division (I à IV) masquée pour Maître et au-dessus.

## R4. Quotas et cache (principe II)

- **Vérifié** (en-têtes) : app `20:1,100:120` (clé de dev) ; méthode spectator `3000:10` ;
  méthode league `20000:10`. La limite réelle reste l'**app** : 100 requêtes / 2 min.
- **Coût d'une card** : 1 (account, déjà en cache 1 h grâce à la 001) + 1 (spectator) + 10
  (league) ≈ 11 requêtes.
- **Décision** :
  - partie en cours : **jamais en cache** (l'utilisateur clique justement pour une info fraîche) ;
  - classement : cache **10 min par PUUID** (FR-016) → un 2e clic ne coûte qu'1 requête ;
  - toutes ces requêtes en priorité `interactive` (le limiteur de la 001 les fait passer avant une
    éventuelle analyse en cours).
- **Alternatives** : cache spectator 30 s (rejeté : l'utilisateur veut voir une partie qui vient
  de commencer) ; pas de cache league (rejeté : principe II, 10 requêtes par clic).

## R5. Champions (Data Dragon)

- **Constat** : spectator renvoie `championId` (numéro), pas le nom.
- **Décision** : `static-data.ts` charge `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json`
  (cache 6 h, comme les versions) et construit la table `key` (numéro) → `id` (ex. `154` → `Zac`).
  L'`id` sert au nom affiché et à l'URL de l'icône, **comme dans l'historique de la 001** (cohérence).
  Champion inconnu (nouveau champion pas encore dans Data Dragon) → nom « Champion {id} », icône
  absente.

## R6. Découpage en deux requêtes (composition puis statistiques)

- **Décision** : deux routes REST internes :
  1. `GET /api/players/{platform}/{riotId}/live-game` → état + composition (rapide, 1 requête Riot) ;
  2. `GET /api/ranked/{platform}?puuids=…` (10 max) → statistiques des joueurs.
  L'interface appelle (2) dès que (1) a répondu → FR-015 (« composition d'abord, statistiques
  ensuite ») et indisponibilité gérée **par joueur**.
- **Alternatives** : une seule route renvoyant tout (rejeté : la card attendrait les 10 appels
  league ; une erreur sur un joueur bloquerait tout) ; streaming (rejeté : YAGNI).

## R7. Réutilisation de la feature 001

- **Décision** : badges `👥` (`GET /api/reference/{puuid}/encounters?with=`), panneau
  `EncounterPanel`, lien « Voir le profil », format d'erreur `ApiError`, limiteur, caches et
  client Riot sont réutilisés tels quels. Seul ajustement : `EncounterPanel` accepte un joueur
  « minimal » (`puuid`, `gameName`, `tagLine`) au lieu d'un `Participant` complet de l'historique.

## R8. Branche

- La branche `002-live-game-card` part de `001-historique-joueur` (PR #1 pas encore fusionnée).
  Une fois la PR #1 fusionnée dans `main`, la branche 002 sera rebasée sur `main`.
