---

description: "Task list for feature 001-historique-joueur"
---

# Tasks: Historique d'un joueur et « a-t-il déjà joué avec moi ? »

**Input**: Design documents from `specs/001-historique-joueur/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.openapi.yaml, quickstart.md

**Tests**: **OBLIGATOIRES** — la constitution (principe III, NON NÉGOCIABLE) impose le TDD : chaque
test est écrit d'abord, lancé, et doit **échouer** avant l'implémentation correspondante. L'API
Riot est toujours simulée (MSW, `onUnhandledFrame: 'error'`).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Conventions (rappel du plan — à respecter dans TOUTES les tâches)

- SvelteKit **3** : imports via `#lib/...` **avec extension** (`#lib/shared/riot-id.ts`), jamais `$lib` ;
  réponses REST avec `Response.json(...)` (pas `json()`) ; `$app/state` (pas `$app/stores`) ;
  pas de remote functions.
- Svelte 5 : runes (`$state`, `$derived`, `$props`, `$effect`).
- Code contenant la clé : uniquement sous `src/lib/server/` ; seul `src/lib/server/config.ts` lit `RIOT_API_KEY`.
- Tests serveur : `*.test.ts` à côté du code (projet Vitest `server`, Node + MSW).
  Tests composants : `*.svelte.test.ts` à côté du composant (projet Vitest `client`, navigateur).
- Erreurs : toujours au format `{ error: ApiError }` (codes et messages : data-model.md).
- Style : Tailwind 4, palette `zinc`, une couleur d'accent, vert/rouge réservés victoire/défaite.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Créer le projet SvelteKit dans le dépôt existant sans perdre nos fichiers.

- [X] T001 Créer le projet dans la racine du dépôt (`README.md` et `.gitignore` sont commités, donc récupérables) avec `npx sv@1.1.1 create . --template minimal --types ts --add tailwindcss="plugins:none" vitest="usages:unit,component" prettier eslint --install npm --no-dir-check` ; vérifier que `.claude/`, `.specify/`, `specs/` sont intacts (`git status`)
- [X] T002 Fusionner `.gitignore` : reprendre la version commitée (`git show HEAD:.gitignore`) + les entrées ajoutées par `sv`, et ajouter `data/` ; vérifier que `.env` et `.env.*` sont ignorés et `!.env.example` autorisé, dans `.gitignore`
- [X] T003 Fusionner `README.md` : reprendre la version commitée (`git show HEAD:README.md`) et y ajouter une section « Développement » (`npm install`, `npx playwright install chromium`, `cp .env.example .env`, `npm run dev`, `npm run test`, `npm run check`, `npm run lint`) dans `README.md`
- [X] T004 Remplacer `@sveltejs/adapter-auto` par `@sveltejs/adapter-node@6.0.0` dans `package.json` et `vite.config.ts` ; figer `typescript` à `6.0.3` (PAS 7) ; vérifier les versions installées : `@sveltejs/kit` 3.1.0, `svelte` 5.57.x, `tailwindcss` 4.3.3, `vitest` 4.1.x
- [X] T005 [P] Installer les dépendances : `npm install zod@4` et `npm install -D msw@3`, puis `npx playwright install chromium` ; vérifier que `package-lock.json` est mis à jour
- [X] T006 [P] Créer `.env.example` contenant uniquement `RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` et un commentaire expliquant où obtenir la clé (developer.riotgames.com, expire toutes les 24 h)
- [X] T007 Vérifier que `package.json` contient `"imports": { "#lib": "./src/lib/index.ts", "#lib/*": "./src/lib/*" }` (adapter l'extension si `sv` a généré `.js`) et que les projets Vitest `client` et `server` existent dans `vite.config.ts`
- [X] T008 Lancer `npm run test`, `npm run check`, `npm run lint` sur le squelette : tout doit passer ; supprimer le test d'exemple généré par `sv` s'il n'a plus de sens ; commit `chore: scaffold SvelteKit 3 + Tailwind 4 + Vitest`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Briques communes à toutes les User Stories (types, Riot ID, routage, cache, limiteur, client Riot, erreurs, mise en page).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (écrire d'abord, vérifier qu'ils ÉCHOUENT) ⚠️

- [X] T009 [P] Tests du Riot ID dans `src/lib/shared/riot-id.test.ts` : `parseRiotIdInput('Pseudo#TAG')` → `{ gameName, tagLine }` ; refus si pas de `#`, tag vide ; « `gameName` : 3–16 caractères ; `tagLine` : 3–5 caractères alphanumériques ; espaces de début/fin retirés ; comparaison insensible à la casse ; pas de restriction ASCII » (accepter `Le Joueur#EUW`, `제우스#KR1`) ; `toUrlSegment` → `encodeURIComponent(gameName) + '-' + encodeURIComponent(tagLine)` ; `parseUrlSegment` découpe sur le **dernier** `-`
- [X] T010 [P] Tests du routage dans `src/lib/server/riot/routing.test.ts` : table R7 — `euw1, eun1, tr1, ru, me1` → `europe` ; `na1, br1, la1, la2` → `americas` ; `kr, jp1` → `asia` ; `oc1, sg2, tw2, vn2` → match `sea` mais account `asia` ; plateforme inconnue → erreur `INVALID_PLATFORM`
- [X] T011 [P] Tests du cache dans `src/lib/server/cache.test.ts` (horloge injectée) : valeur renvoyée avant expiration, absente après le TTL, éviction de l'entrée la plus ancienne au-delà de `maxEntries`, `getOrLoad` n'appelle le chargeur qu'une fois pour deux appels simultanés
- [X] T012 [P] Tests du limiteur dans `src/lib/server/riot/rate-limiter.test.ts` (horloge et `sleep` injectés, pas de faux timers MSW) : fenêtres initiales 20/1 s et 100/120 s respectées ; recalage depuis `X-App-Rate-Limit: 20:1,100:120` et `X-App-Rate-Limit-Count` ; idem par méthode : `X-Method-Rate-Limit(-Count)` crée/recale une fenêtre propre à l'endpoint (clé = nom de méthode, ex. `match-v5.getMatch`), et une requête attend si l'app OU sa méthode est saturée ; après `pauseFor(retryAfterSeconds)` aucune requête avant la fin ; une tâche `interactive` en attente passe **avant** les tâches `background` déjà en file ; limiteurs indépendants par hôte
- [X] T013 [P] Créer les fixtures Riot réalistes dans `tests/fixtures/riot/` : `account-reference.json`, `account-friend.json`, `summoner.json` (champs `puuid`, `profileIconId`, `summonerLevel`, `revisionDate` uniquement), `match-ids.json`, et des `MatchDto` : `match-ranked-win.json`, `match-ranked-loss.json`, `match-remake.json` (`gameEndedInEarlySurrender: true`), `match-coop-bots.json` (participants bots avec `puuid: "BOT"` et `riotIdGameName: ""`) ; le PUUID « friend » apparaît dans 3 matchs avec la référence (2 même équipe, 1 adversaire), avec un `riotIdGameName` différent dans l'un d'eux (joueur renommé) ; `gameEndTimestamp` présent (durée en secondes) sauf dans un match (durée en ms)
- [X] T014 Créer le serveur MSW dans `tests/msw/handlers.ts` (handlers des 4 endpoints Riot de research.md R6 + `ddragon.leagueoflegends.com/api/versions.json` + `static.developer.riotgames.com/docs/lol/queues.json`, servant les fixtures ; helpers `riotError(status, { retryAfter? })` pour 401/403/404/429/503) et `tests/msw/setup.ts` (`server.listen({ onUnhandledFrame: 'error' })`, `resetHandlers` après chaque test, `close`) ; l'enregistrer dans `setupFiles` du **seul** projet `server` de `vite.config.ts`
- [X] T015 [P] Tests du client Riot dans `src/lib/server/riot/client.test.ts` (MSW, `#lib/server/config.ts` mocké par `vi.mock` avec une fausse clé `RGAPI-test`) : en-tête `X-Riot-Token` envoyé ; 404 → `PLAYER_NOT_FOUND` ; 401 et 403 → `RIOT_API_KEY_INVALID`, SAUF `getMatch` où 403/404 → erreur interne `MATCH_UNAVAILABLE` (match ignoré, pas d'avertissement de clé) ; 429 avec `Retry-After: 2` → pause de l'hôte puis 1 nouvel essai réussi ; 429 sans `Retry-After` → pause 1 s puis 1 essai ; 5xx → `RIOT_UNAVAILABLE` ; réponse au mauvais format → `RIOT_UNAVAILABLE` ; la chaîne `RGAPI-test` n'apparaît dans **aucun** message d'erreur ; un 401/403 (hors `getMatch`) écrit UNE seule fois `console.warn("[Riot] Clé API invalide ou expirée — régénère-la sur developer.riotgames.com")`, sans la clé
- [X] T016 [P] Tests des erreurs dans `src/lib/server/errors.test.ts` : chaque code du tableau ApiError de data-model.md → bon statut HTTP (400/404/409/429/503/500) et corps `{ error: { code, message } }` ; `RIOT_RATE_LIMITED` ajoute `retryAfterSeconds` et l'en-tête `Retry-After` ; une erreur inconnue → `INTERNAL_ERROR` sans détail technique
- [X] T017 [P] Tests des données statiques dans `src/lib/server/static-data.test.ts` (MSW) : version Data Dragon = `versions.json[0]` ; URL d'icône champion `https://ddragon.leagueoflegends.com/cdn/{v}/img/champion/{championName}.png` ; icône de profil `.../img/profileicon/{id}.png` ; libellés français pour les files 420 (Classée Solo/Duo), 440 (Classée Flex), 400 (Normale – Draft), 430 (Normale – Aveugle), 450 (ARAM), 490 (Partie rapide), 1700 (Arena), 900 (URF) ; repli sur `description` de queues.json pour une file inconnue ; mise en cache 6 h
- [X] T018 [P] Tests composants dans `src/lib/components/ErrorMessage.svelte.test.ts` (affiche `error.message`, mentionne le délai si `retryAfterSeconds`, rôle `alert`) et `src/lib/components/LegalFooter.svelte.test.ts` (contient le texte anglais **exact** de research.md R15 + sa traduction française)

### Implementation for Foundational

- [X] T019 [P] Créer tous les types partagés de data-model.md dans `src/lib/shared/types.ts` : `Platform`, `Puuid`, `RiotId`, `MatchOutcome` (`'win' | 'loss' | 'remake'`), `TeamSide` (`'blue' | 'red'`), `PlayerProfile`, `Participant`, `MatchSummary`, `MatchPage` (`{ matches, hasMore, skipped }`), `ReferenceAccount`, `AnalysisStatus` (`state: 'never' | 'running' | 'done' | 'failed'`), `EncounterStats`, `EncounterSummary`, `EncounterCounts`, `ApiErrorCode`, `ApiError`
- [X] T020 [P] Implémenter `src/lib/shared/riot-id.ts` (fait passer T009)
- [X] T021 [P] Implémenter `src/lib/shared/platforms.ts` : les 15 plateformes de data-model.md avec libellés (« Europe Ouest (EUW) »…), `DEFAULT_PLATFORM = 'euw1'`, `isPlatform()` (PH2/TH2 exclus)
- [X] T022 [P] Implémenter `src/lib/server/riot/routing.ts` (fait passer T010)
- [X] T023 [P] Implémenter `src/lib/server/cache.ts` : `TtlCache<K, V>` avec horloge injectable, `maxEntries`, `getOrLoad` dédupliquant les chargements concurrents (fait passer T011)
- [X] T024 [P] Implémenter `src/lib/server/riot/rate-limiter.ts` : un limiteur par hôte, fenêtres glissantes, `updateFromHeaders(headers, method)` (fenêtres app ET méthode), `pauseFor(seconds)`, `schedule(task, priority: 'interactive' | 'background')` (fait passer T012)
- [X] T025 [P] Implémenter `src/lib/server/errors.ts` : classe `AppError(code, message, status, retryAfterSeconds?)`, constructeurs nommés par code avec les messages français de data-model.md, `toErrorResponse(err)` utilisant `Response.json` (fait passer T016)
- [X] T026 Créer `src/env.ts` (`defineEnvVars({ RIOT_API_KEY: { schema: z.string().startsWith('RGAPI-') } })`) et `src/lib/server/config.ts`, **seul** module qui importe `RIOT_API_KEY` depuis `$app/env/private` et l'expose via `getRiotApiKey()`
- [X] T027 Créer les schémas zod dans `src/lib/server/riot/schemas.ts` : `AccountDto` (`puuid`, `gameName?`, `tagLine?`), `SummonerDto` (`puuid`, `profileIconId`, `summonerLevel`, `revisionDate`), `MatchIdsDto` (`string[]`), `MatchDto` (`metadata.matchId`, `info.gameStartTimestamp`, `info.gameEndTimestamp?`, `info.gameDuration`, `info.queueId`, `info.participants[]` avec `puuid`, `riotIdGameName`, `riotIdTagline`, `championName`, `teamId`, `win`, `kills`, `deaths`, `assists`, `gameEndedInEarlySurrender`) — champs inconnus ignorés
- [X] T028 Implémenter `src/lib/server/riot/client.ts` : `getAccountByRiotId`, `getSummonerByPuuid`, `getMatchIds(puuid, region, { start, count })` (count ≤ 100), `getMatch(matchId, region)` ; chaque appel passe par le limiteur avec une priorité, valide la réponse avec zod, convertit les statuts HTTP en `AppError` ; `getMatch` traduit 403/404 en `MATCH_UNAVAILABLE` ; avertissement unique dans le terminal sur 401/403 ; ne journalise jamais la clé (fait passer T015) — dépend de T022–T027
- [X] T029 Implémenter `src/lib/server/static-data.ts` (fait passer T017) — dépend de T023
- [X] T030 Créer `src/hooks.server.ts` : `handleError` journalise l'erreur côté serveur (sans en-têtes ni clé) et renvoie `{ status, message }` générique
- [X] T031 [P] Implémenter `src/lib/client/api.ts` : `apiGet<T>(path)` / `apiPost<T>(path, body)` typés ; si `!res.ok`, lève `ClientApiError` portant l'`ApiError` du corps (repli `INTERNAL_ERROR` si le corps est illisible)
- [X] T032 [P] Implémenter `src/lib/components/ErrorMessage.svelte` et `src/lib/components/LegalFooter.svelte` (font passer T018)
- [X] T033 Mettre en page `src/routes/+layout.svelte` et `src/routes/layout.css` : fond `zinc-50`, contenu centré (max `4xl`), en-tête sobre « LeagueApp » cliquable vers `/`, emplacement réservé pour le compte de référence (rempli en US2), `LegalFooter` en bas de toutes les pages (FR-020) ; barre de chargement fine en haut de page tant que `navigating.to` (de `$app/state`) est défini (FR-019)

**Checkpoint**: `npm run test` et `npm run check` passent — les User Stories peuvent commencer.

---

## Phase 3: User Story 1 - Rechercher un joueur et consulter son historique (Priority: P1) 🎯 MVP

**Goal**: Rechercher un Riot ID sur un serveur, voir le profil et l'historique paginé (20 par 20), déplier un match pour voir les 10 participants ; messages clairs en cas d'erreur.

**Independent Test**: Rechercher un Riot ID existant → profil + 20 matchs (champion, résultat, KDA, mode, date, durée) ; déplier un match → 2 équipes de 5 ; « Plus de matchs » → 20 de plus ; Riot ID inconnu → « Joueur introuvable » (quickstart scénarios 1 à 6).

### Tests for User Story 1 (écrire d'abord, vérifier qu'ils ÉCHOUENT) ⚠️

- [X] T034 [P] [US1] Tests du service dans `src/lib/server/players.test.ts` (MSW) : `getProfile(platform, riotId)` → `PlayerProfile` (2e appel servi par le cache, aucune requête Riot) ; `getMatchPage(platform, riotId, start, count)` → `MatchSummary[]` du plus récent au plus ancien ; `outcome` `win`/`loss` et `remake` si `gameEndedInEarlySurrender` ; `durationSeconds` = `gameDuration` si `gameEndTimestamp` présent sinon `gameDuration / 1000` ; `teams` = `blue` (teamId 100) puis `red` (200), 5 participants chacun ; bots → `isBot: true`, `puuid: null` ; `queueLabel` français ; un match en 403/404 est omis et compté dans `skipped` ; `hasMore = (nombre d'IDs reçus === count)` ; appels en priorité `interactive`
- [X] T035 [P] [US1] Tests de route dans `src/routes/api/players/[platform]/[riotId]/server.test.ts` (appel direct de `GET` avec un `RequestEvent` minimal) : 200 conforme au schéma `PlayerProfile` du contrat ; 400 `INVALID_RIOT_ID` (`abc` sans tag, tag de 6 caractères) ; 400 `INVALID_PLATFORM` (`ph2`) ; 404 `PLAYER_NOT_FOUND` ; 503 `RIOT_API_KEY_INVALID` sur 401 Riot
- [X] T036 [P] [US1] Tests de route dans `src/routes/api/players/[platform]/[riotId]/matches/server.test.ts` : `start` ≥ 0 et `count` entre 1 et 20 (défauts 0 et 20), sinon 400 ; 200 `{ matches, hasMore, skipped }` ; 429 `RIOT_RATE_LIMITED` avec en-tête `Retry-After`
- [X] T037 [P] [US1] Test composant `src/lib/components/SearchForm.svelte.test.ts` : liste déroulante de 15 serveurs, `euw1` sélectionné par défaut ; saisie `Pseudo` → message « Format attendu : Pseudo#TAG… » et **aucune** navigation ; saisie `Faker#KR1` + `kr` → navigation vers `/joueur/kr/Faker-KR1`
- [X] T038 [P] [US1] Test composant `src/lib/components/MatchRow.svelte.test.ts` : affiche champion (icône + nom), « Victoire »/« Défaite »/« Partie annulée », KDA au format `K / D / A`, mode, date relative et durée `mm:ss` ; replié par défaut ; clic → 2 `TeamTable` de 5 participants avec Riot ID, champion, KDA et résultat de l'équipe ; bots affichés comme « Bot »
- [X] T039 [P] [US1] Test composant `src/lib/components/MatchList.svelte.test.ts` : liste vide → « Aucune partie récente » ; bouton « Plus de matchs » visible si `hasMore`, ajoute la page suivante à la fin ; indicateur de chargement pendant l'attente ; en cas d'erreur sur la page suivante, les matchs déjà affichés restent et `ErrorMessage` apparaît (FR-019)

### Implementation for User Story 1

- [X] T040 [US1] Implémenter `src/lib/server/players.ts` : `getProfile` (account-v1 sur la région account, summoner-v4 sur la plateforme, caches 1 h et 5 min), `getMatchPage` (IDs en cache 5 min, détails de match en cache illimité max 1 000, récupérés en parallèle via le limiteur, conversion en `MatchSummary`) (fait passer T034)
- [X] T041 [US1] Implémenter `src/routes/api/players/[platform]/[riotId]/+server.ts` : valide `platform` et `riotId` (`parseUrlSegment`), appelle `getProfile`, `Response.json` ; erreurs via `toErrorResponse` (fait passer T035)
- [X] T042 [US1] Implémenter `src/routes/api/players/[platform]/[riotId]/matches/+server.ts` (fait passer T036)
- [X] T043 [P] [US1] Implémenter `src/lib/components/SearchForm.svelte` (validation côté client avec `parseRiotIdInput`, `goto` vers `/joueur/{platform}/{toUrlSegment}`) (fait passer T037)
- [X] T044 [P] [US1] Implémenter `src/lib/components/PlayerHeader.svelte` : icône de profil, `gameName#tagLine`, « Niveau N », serveur
- [X] T045 [P] [US1] Implémenter `src/lib/components/TeamTable.svelte` : 5 lignes (icône champion, Riot ID ou « Bot », KDA), en-tête d'équipe coloré selon le résultat ; chaque ligne humaine expose un emplacement (snippet) pour des actions ajoutées en US2/US3
- [X] T046 [US1] Implémenter `src/lib/components/MatchRow.svelte` (utilise `TeamTable`) (fait passer T038)
- [X] T047 [US1] Implémenter `src/lib/components/MatchList.svelte` (appelle `apiGet` pour les pages suivantes) (fait passer T039)
- [X] T048 [US1] Implémenter la page d'accueil `src/routes/+page.svelte` : titre, courte explication, `SearchForm`
- [X] T049 [US1] Implémenter `src/routes/joueur/[platform]/[riotId]/+page.ts` (load : profil + 1re page via `fetch` vers notre API ; une `ClientApiError` est transmise à la page, pas levée) et `src/routes/joueur/[platform]/[riotId]/+page.svelte` (`SearchForm` compact, `PlayerHeader`, `MatchList`, `ErrorMessage` pour 400/404/429/503 ; si 404 en arrivant depuis « Voir le profil » (paramètre `?from=match`), ajouter « Ce joueur a peut-être changé de pseudo depuis cette partie. »)
- [ ] T050 [US1] Valider manuellement les scénarios 1 à 6 de `specs/001-historique-joueur/quickstart.md` avec une vraie clé ; cocher les tâches ; commit `feat(us1): recherche de joueur et historique de matchs`

**Checkpoint**: User Story 1 entièrement fonctionnelle et testable seule = **MVP**.

---

## Phase 4: User Story 2 - Savoir si un participant a déjà joué avec moi (Priority: P2)

**Goal**: Définir son compte de référence, lancer l'analyse des 100 dernières parties (progression, reprise incrémentale), voir les badges `👥 N` dans les matchs et le résumé détaillé au clic.

**Independent Test**: Avec un compte de référence analysé, ouvrir un match contenant un joueur déjà croisé → badge `👥 N` ; clic → résumé exact ; clic sur un inconnu → « Jamais joué ensemble » + période (quickstart scénarios 7 à 15).

### Tests for User Story 2 (écrire d'abord, vérifier qu'ils ÉCHOUENT) ⚠️

- [ ] T051 [P] [US2] Tests purs dans `src/lib/server/analysis/encounters.test.ts` (à partir d'une `Analysis` construite en mémoire) : `countEncounters(analysis, puuids)` n'inclut **que** les joueurs croisés ; `summarizeEncounter` → `sameTeam`/`opponents` avec `games`, `wins`, `losses`, `remakes` du point de vue de la référence ; invariants « `total = sameTeam.games + opponents.games` ; `games = wins + losses + remakes` dans chaque catégorie ; un match n'est compté qu'une fois » ; `isSelf` si `otherPuuid` = référence ; `games` triés du plus récent au plus ancien ; `period = { analyzedCount, oldestMatchAt }` toujours présent ; bots jamais comptés ; joueur renommé (même PUUID, pseudo différent) compté comme une seule personne (FR-014)
- [ ] T052 [P] [US2] Tests du stockage dans `src/lib/server/analysis/store.test.ts` (dossier temporaire `os.tmpdir()`) : `load` d'un PUUID inconnu → `null` ; aller-retour `save`/`load` identique ; fichier `data/analyses/{puuid}.json` avec `schemaVersion: 1` ; écriture atomique (fichier temporaire puis `rename`, aucun fichier partiel si l'écriture échoue) ; `InMemoryAnalysisStore` respecte la même interface
- [ ] T053 [P] [US2] Tests de l'analyseur dans `src/lib/server/analysis/analyzer.test.ts` (MSW + `InMemoryAnalysisStore`) : 1re analyse = 1 appel IDs (`count=100`) + 1 appel par match, priorité `background` ; progression `processed/total` ; 2e analyse : aucun match déjà présent dans `matches` ou `unavailableMatchIds` n'est redemandé ; matchs sortis de la fenêtre retirés ; 403/404 sur un match → ajouté à `unavailableMatchIds`, l'analyse continue ; sauvegarde tous les 10 matchs ; 401 → `state: 'failed'` avec `RIOT_API_KEY_INVALID` ; second démarrage pendant `running` → `ANALYSIS_ALREADY_RUNNING` ; `lastAnalyzedAt` renseigné à la fin seulement
- [ ] T054 [P] [US2] Tests de route dans `src/routes/api/reference/[puuid]/analysis/server.test.ts` : `GET` → `state: 'never'` sans fichier, puis `running`, puis `done` ; `POST { platform }` → 202 ; `POST` pendant une analyse → 409 ; `platform` invalide → 400
- [ ] T055 [P] [US2] Tests de route dans `src/routes/api/reference/[puuid]/encounters/server.test.ts` (`?with=` : 1 à 10 PUUID séparés par des virgules, sinon 400 ; 404 `REFERENCE_NOT_ANALYZED` sans analyse ; 200 `{ counts }`) et `src/routes/api/reference/[puuid]/encounters/[otherPuuid]/server.test.ts` (200 conforme à `EncounterSummary`, `total: 0` pour un inconnu, `isSelf: true` pour soi-même, 404 sans analyse)
- [ ] T056 [P] [US2] Tests de l'état du compte de référence dans `src/lib/client/reference.svelte.test.ts` : `setReference` persiste dans `localStorage` (clé `leagueapp.reference`) ; relu au chargement ; `clearReference` efface ; aucune exception si `localStorage` lève une erreur (mode privé)
- [ ] T057 [P] [US2] Tests composants `src/lib/components/ReferenceAccount.svelte.test.ts` (sans référence : champ « Mon Riot ID » + serveur + bouton ; avec référence : affiche `gameName#tagLine`, boutons « Modifier » et « Effacer » ; Riot ID introuvable (404) → `ErrorMessage` affiché et la référence n'est PAS enregistrée) et `src/lib/components/AnalysisControl.svelte.test.ts` (bouton « Analyser mon historique » ; pendant l'analyse « 37 / 100 parties analysées » et bouton désactivé ; « Dernière analyse : il y a 2 jours » ; message d'erreur si `failed`)
- [ ] T058 [P] [US2] Tests composants `src/lib/components/EncounterBadge.svelte.test.ts` (`count = 3` → `👥 3` avec libellé accessible « 3 parties ensemble » ; `count` absent → rien) et `src/lib/components/EncounterPanel.svelte.test.ts` (résumé complet ; « C'est vous » ; « Jamais joué ensemble sur tes N dernières parties (depuis le JJ/MM/AAAA) » ; sans référence → invitation à définir son Riot ID ; sans analyse → invitation à lancer l'analyse ; liste détaillée dépliable : date, mode, champions, résultat)

### Implementation for User Story 2

- [ ] T059 [P] [US2] Implémenter `src/lib/server/analysis/store.ts` : interface `AnalysisStore { load(puuid), save(analysis) }`, `JsonFileAnalysisStore` (dossier `data/analyses/`, créé si absent, écriture atomique) et `InMemoryAnalysisStore` (fait passer T052)
- [ ] T060 [P] [US2] Implémenter `src/lib/server/analysis/encounters.ts` : fonctions pures `countEncounters` et `summarizeEncounter` (fait passer T051)
- [ ] T061 [US2] Implémenter `src/lib/server/analysis/analyzer.ts` : registre en mémoire des analyses par PUUID, `startAnalysis(puuid, platform)`, `getStatus(puuid)` ; conversion `MatchDto` → `AnalyzedMatch` (`others` ≤ 9, bots exclus) ; fenêtre glissante des 100 derniers IDs ; sauvegarde tous les 10 matchs (fait passer T053) — dépend de T059
- [ ] T062 [US2] Implémenter `src/routes/api/reference/[puuid]/analysis/+server.ts` (`GET` état, `POST` démarrage → 202) (fait passer T054)
- [ ] T063 [US2] Implémenter `src/routes/api/reference/[puuid]/encounters/+server.ts` et `src/routes/api/reference/[puuid]/encounters/[otherPuuid]/+server.ts` (fait passer T055) — dépend de T059, T060
- [ ] T064 [P] [US2] Implémenter `src/lib/client/reference.svelte.ts` (état `$state` + `localStorage` protégé par `try/catch`) (fait passer T056)
- [ ] T065 [P] [US2] Implémenter `src/lib/components/ReferenceAccount.svelte` (définir via `GET /api/players/...` pour obtenir le PUUID, modifier, effacer) et `src/lib/components/AnalysisControl.svelte` (POST puis interrogation de l'état **toutes les secondes** tant que `state === 'running'`, arrêt du polling au démontage) (fait passer T057)
- [ ] T066 [P] [US2] Implémenter `src/lib/components/EncounterBadge.svelte` et `src/lib/components/EncounterPanel.svelte` (fait passer T058)
- [ ] T067 [US2] Intégrer dans l'interface : `ReferenceAccount` + `AnalysisControl` dans l'en-tête de `src/routes/+layout.svelte` ; dans `src/lib/components/MatchRow.svelte`, au dépliage, un seul appel `GET /api/reference/{puuid}/encounters?with=…` (PUUID humains du match) si la référence est analysée ; `EncounterBadge` à côté des joueurs concernés dans `TeamTable` ; clic sur un participant → `EncounterPanel` en panneau latéral à droite (fermable, touche Échap) dans `src/routes/joueur/[platform]/[riotId]/+page.svelte`
- [ ] T068 [US2] Valider manuellement les scénarios 7 à 15 de `specs/001-historique-joueur/quickstart.md` (dont : analyse < 3 min, recherche rapide pendant l'analyse) ; commit `feat(us2): parties communes, analyse et badges`

**Checkpoint**: User Stories 1 ET 2 fonctionnent ; US2 s'appuie sur l'interface de US1 (MatchRow/TeamTable) mais son backend est testable seul.

---

## Phase 5: User Story 3 - Naviguer vers le profil d'un participant (Priority: P3)

**Goal**: Ouvrir en un clic le profil d'un participant humain d'un match, et revenir à l'historique précédent là où on l'avait laissé.

**Independent Test**: Déplier un match → « Voir le profil » d'un participant → son profil s'affiche ; retour arrière → historique précédent restauré (quickstart scénario 16).

### Tests for User Story 3 (écrire d'abord, vérifier qu'ils ÉCHOUENT) ⚠️

- [ ] T069 [P] [US3] Tests dans `src/lib/shared/platforms.test.ts` : `platformFromMatchId('EUW1_7212345678')` → `euw1`, `'OC1_…'` → `oc1`, préfixe inconnu → `null`
- [ ] T070 [P] [US3] Test composant `src/lib/components/TeamTable.svelte.test.ts` : chaque participant humain a un lien « Voir le profil » vers `/joueur/{platform}/{gameName}-{tagLine}` (plateforme déduite du `matchId`, parties encodées) ; aucun lien pour un bot

### Implementation for User Story 3

- [ ] T071 [US3] Ajouter `platformFromMatchId` dans `src/lib/shared/platforms.ts` (fait passer T069)
- [ ] T072 [US3] Ajouter le lien « Voir le profil » (URL suffixée de `?from=match`) dans `src/lib/components/TeamTable.svelte` (fait passer T070)
- [ ] T073 [US3] Restaurer l'état au retour arrière dans `src/routes/joueur/[platform]/[riotId]/+page.svelte` via `export const snapshot` (matchs déjà chargés + match déplié ; le défilement est restauré nativement par SvelteKit)
- [ ] T074 [US3] Valider manuellement le scénario 16 de `specs/001-historique-joueur/quickstart.md` ; commit `feat(us3): navigation vers le profil d'un participant`

**Checkpoint**: Toutes les User Stories sont fonctionnelles indépendamment.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Sécurité, accessibilité, documentation, validation finale.

- [ ] T075 [P] Vérifier qu'aucun secret ne fuit : `npm run build` puis `grep -rn "RGAPI\|X-Riot-Token\|RIOT_API_KEY" build/client` ne trouve rien ; `git grep -n "RGAPI-" -- ':!.env.example'` ne trouve rien
- [ ] T076 [P] Accessibilité de base dans `src/lib/components/*.svelte` : `<label>` sur chaque champ, boutons au clavier, focus visible, contraste suffisant, `aria-expanded` sur les matchs dépliables
- [ ] T077 [P] Mettre à jour `README.md` : remplacer la mention légale par le texte anglais **exact** de research.md R15 (+ traduction) et lister les fonctionnalités de la feature 001
- [ ] T078 Lancer `npm run test`, `npm run check`, `npm run lint` : 0 échec, 0 erreur ; vérifier que chaque exigence FR-001 à FR-020 est couverte par au moins un test (quality gate de la constitution)
- [ ] T079 Dérouler l'intégralité des 18 scénarios de `specs/001-historique-joueur/quickstart.md` (dont 17 : fausse clé, et 18 : mention légale) ; commit `chore: polish feature 001`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** : aucune dépendance.
- **Foundational (Phase 2)** : dépend du Setup — **bloque toutes les User Stories**.
- **US1 (Phase 3)** : dépend de la Phase 2.
- **US2 (Phase 4)** : backend (T051–T055, T059–T063) dépend seulement de la Phase 2 ; intégration UI (T067) dépend de US1 (`MatchRow`, `TeamTable`, page joueur).
- **US3 (Phase 5)** : dépend de US1 (`TeamTable`, page joueur).
- **Polish (Phase 6)** : après les User Stories souhaitées.

### Within Each User Story

- Tests écrits et **en échec** avant l'implémentation (principe III).
- Types → services → routes `+server.ts` → composants → intégration dans les pages.
- Commit à chaque checkpoint.

### Graphe

```text
Setup ──► Foundational ──► US1 (MVP) ──► US3
                    │            │
                    └──► US2 backend ──► US2 UI (après US1)
                                              │
                                   Polish ◄───┴──── (après US1–US3)
```

### Parallel Opportunities

- Phase 1 : T005 et T006.
- Phase 2 : tous les tests T009–T013 et T015–T018 ; implémentations T019–T025, T031, T032.
- US1 : tests T034–T039 ; composants T043–T045.
- US2 : tests T051–T058 ; T059, T060, T064, T065, T066.
- US3 : T069 et T070.

---

## Parallel Example: User Story 1

```bash
# Tous les tests de US1 ensemble (ils doivent échouer) :
Task: "Tests du service dans src/lib/server/players.test.ts"
Task: "Tests de route dans src/routes/api/players/[platform]/[riotId]/server.test.ts"
Task: "Tests de route dans src/routes/api/players/[platform]/[riotId]/matches/server.test.ts"
Task: "Test composant src/lib/components/SearchForm.svelte.test.ts"
Task: "Test composant src/lib/components/MatchRow.svelte.test.ts"
Task: "Test composant src/lib/components/MatchList.svelte.test.ts"

# Puis les composants indépendants ensemble :
Task: "Implémenter src/lib/components/SearchForm.svelte"
Task: "Implémenter src/lib/components/PlayerHeader.svelte"
Task: "Implémenter src/lib/components/TeamTable.svelte"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 : Setup
2. Phase 2 : Foundational (CRITIQUE — bloque tout)
3. Phase 3 : User Story 1
4. **STOP et VALIDER** : quickstart scénarios 1 à 6
5. L'app est déjà utile : chercher n'importe quel joueur et voir ses parties

### Incremental Delivery

1. Setup + Foundational → fondations prêtes
2. + US1 → valider → commit (MVP)
3. + US2 → valider → commit (objectif principal : « je connais ce joueur ? »)
4. + US3 → valider → commit
5. Polish → quality gates → fusion de `001-historique-joueur` dans `main`

---

## Notes

- [P] = fichiers différents, aucune dépendance sur une tâche non terminée.
- [USx] = traçabilité vers la User Story de spec.md.
- Vérifier que les tests échouent **avant** d'implémenter.
- Cocher chaque tâche (`- [x]`) dès qu'elle est terminée.
- À éviter : tâches vagues, deux tâches [P] sur le même fichier, appels réseau réels dans les tests.
