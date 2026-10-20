# Research: Historique d'un joueur et « a-t-il déjà joué avec moi ? »

**Phase 0** du plan — chaque décision suit le format Décision / Justification / Alternatives.
Faits vérifiés le 2026-10-20 (npm registry, svelte.dev, developer.riotgames.com, sondes HTTP).

---

## R1. Framework : SvelteKit 3

- **Décision** : SvelteKit **3.1.0** + Svelte **5.57.x** (runes), projet unique front + serveur.
- **Justification** : choix de l'utilisateur. SvelteKit fournit la partie serveur indispensable au
  principe I (la clé Riot ne quitte jamais le serveur) et des routes `+server.ts` pour exposer
  une API REST interne. Kit 3.0.0 est sorti le 2026-10-01, 3.1.0 le 2026-10-14 (stable).
- **Alternatives** : Svelte seul (pas de serveur → clé exposée, rejeté) ; SvelteKit 2.x (plus
  ancien, nouvelle base de code sur une version en fin de vie, rejeté).

**Changements de SvelteKit 3 qui impactent le code** (source : svelte.dev/docs/kit/migrating-to-sveltekit-3) :

| Sujet | En SvelteKit 3 |
|---|---|
| Config | Plus de `svelte.config.js` : tout est dans `vite.config.ts` via `sveltekit({...})` |
| Alias `$lib` | **Supprimé** → `#lib/...` (subpath imports de `package.json`), **extensions explicites** (`#lib/server/riot/client.ts`) |
| Variables d'env | Déclarées dans `src/env.ts` avec `defineEnvVars` ; lues via `$app/env/private` (privées et dynamiques par défaut). `$env/static/private` est déprécié |
| Code serveur uniquement | Tout dossier `server/` hors `src/routes` (ou fichier `*.server.ts`) ; l'importer côté client = erreur de build |
| Réponses REST | `Response.json(data)` (le helper `json()` est déprécié) |
| `error()` | `error(status, message?, extraProps?)` |
| Stores | `$app/stores` supprimé → `$app/state` |
| Remote functions | **Expérimentales** → non utilisées (principe IV) |

## R2. Versions figées (compatibles entre elles)

| Paquet | Version | Remarque |
|---|---|---|
| @sveltejs/kit | 3.1.0 | Node ≥ 22.17 (installé : 22.23) |
| svelte | 5.57.2 | |
| vite | 8.3.x | |
| @sveltejs/vite-plugin-svelte | 7.3.x | |
| **typescript** | **6.0.3** | ⚠️ la 7.0 existe mais casse kit (`^6`), svelte-check et typescript-eslint (`<6.1`) |
| tailwindcss / @tailwindcss/vite | 4.3.3 | |
| @sveltejs/adapter-node | 6.0.0 | |
| **vitest** | **4.1.x** | ⚠️ la 5.0 existe, mais `sv add vitest` configure la 4 ; migrer n'apporte rien ici (YAGNI) |
| vitest-browser-svelte / @vitest/browser-playwright | versions installées par `sv` | tests de composants |
| msw | 3.0.3 | simulation HTTP de l'API Riot |
| zod | 4.6.x | validation des réponses Riot + des variables d'env |
| eslint 10 / prettier 3 | via `sv add` | qualité |

- **Décision** : figer ces versions dans `package.json` (`package-lock.json` commité) ; ne
  monter de version majeure qu'avec une raison.
- **Justification** : « dernière version » ≠ « compatible » ; un lockfile rend le projet
  reproductible.
- **Alternatives** : toujours `latest` (rejeté : TypeScript 7 casserait l'outillage).

## R3. Création du projet (scaffolding)

- **Décision** :
  `npx sv@1.1.1 create . --template minimal --types ts --add tailwindcss="plugins:none" vitest="usages:unit,component" prettier eslint --install npm --no-dir-check`,
  puis remplacement de `adapter-auto` par `adapter-node`.
- **⚠️ Piège** : `sv create` **écrase `README.md` et `.gitignore` sans fusion**. → les sauvegarder
  avant, puis fusionner (garder nos règles `.env`, ajouter `data/`). `.claude/`, `.specify/`,
  `specs/` ne sont pas touchés.
- **Justification** : outil officiel, configuration Tailwind + Vitest correcte d'emblée.
- **Alternatives** : configuration manuelle (plus long, plus d'erreurs).

## R4. Styles : Tailwind CSS 4, design sobre

- **Décision** : Tailwind 4 via `@tailwindcss/vite` (fichier `src/routes/layout.css` avec
  `@import 'tailwindcss';`). Palette neutre (gris `zinc`), une seule couleur d'accent, vert/rouge
  réservés victoire/défaite, typographie système, pas de bibliothèque de composants.
- **Justification** : demande « simple et sobre » ; zéro dépendance UI supplémentaire (YAGNI).
- **Alternatives** : bibliothèque de composants (shadcn-svelte, Skeleton) — rejetée pour l'instant.

## R5. Secret : clé API Riot

- **Décision** : `RIOT_API_KEY` déclarée dans `src/env.ts` (`defineEnvVars`, validée par zod :
  préfixe `RGAPI-`), lue **uniquement** dans `src/lib/server/config.ts` via `$app/env/private`,
  envoyée dans l'en-tête `X-Riot-Token`. Fichier `.env` ignoré par git, `.env.example` versionné.
- **Justification** : principe I ; un seul point de lecture = facile à simuler en test (le
  comportement de `$app/env/private` sous Vitest n'est pas garanti → on `vi.mock` ce module).
- **Alternatives** : query param `api_key` (rejeté : la clé apparaîtrait dans les URL/logs).

## R6. API Riot utilisée

| Besoin | Endpoint | Hôte |
|---|---|---|
| Riot ID → PUUID | `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` | régional (americas/asia/europe — **pas sea**) |
| Icône + niveau | `GET /lol/summoner/v4/summoners/by-puuid/{puuid}` | plateforme |
| IDs des matchs | `GET /lol/match/v5/matches/by-puuid/{puuid}/ids?start&count` (count ≤ 100) | régional |
| Détail d'un match | `GET /lol/match/v5/matches/{matchId}` | régional |

- `SummonerDTO` ne contient plus que `puuid`, `profileIconId`, `summonerLevel`, `revisionDate`.
- Champs utilisés de `ParticipantDto` : `puuid`, `riotIdGameName`, `riotIdTagline`,
  `championName`, `teamId` (100/200), `win`, `kills`, `deaths`, `assists`,
  `gameEndedInEarlySurrender` (= remake).
- `gameDuration` est en **secondes** si `gameEndTimestamp` est présent, sinon en millisecondes.
- Historique : 2 ans max, 1000 derniers matchs max par joueur.
- **Certains IDs ne sont pas récupérables par conception** (Brawl / ARAM Mayhem → 403, certains
  matchs bots → 404) → on les ignore individuellement, comptés comme « indisponibles ».
- **Bots** (non documenté officiellement) : `puuid === "BOT"` ou `riotIdGameName` vide → traités
  comme non humains, de façon défensive.

## R7. Routage plateforme → région (match-v5)

| Plateformes (liste déroulante) | Région match-v5 | Région account-v1 |
|---|---|---|
| euw1, eun1, tr1, ru, me1 | europe | europe |
| na1, br1, la1, la2 | americas | americas |
| kr, jp1 | asia | asia |
| oc1, sg2, tw2, vn2 | **sea** | **asia** (account-v1 n'accepte pas sea) |

- **Décision** : table statique dans `#lib/shared/platforms.ts`, EUW1 par défaut.
- PH2 et TH2 **n'existent plus** (fusionnés dans SG2 en janvier 2025) → exclus.
- OCE passe par **sea** pour match-v5 (confirmé par Riot en 2025).

## R8. Quotas (rate limiting) et file de priorité

- **Faits** : clé de dev = **20 req/1 s et 100 req/2 min** par région (limites « app »),
  + limites par méthode. En-têtes : `X-App-Rate-Limit`, `X-App-Rate-Limit-Count`,
  `X-Method-Rate-Limit(-Count)`, `X-Rate-Limit-Type`, `Retry-After` (sur 429).
  Riot : sur 429, « stopper les appels pendant la durée `Retry-After` » ; violations répétées →
  clé blacklistée.
- **Décision** : un limiteur maison (`rate-limiter.ts`) par hôte Riot, fenêtres glissantes
  initialisées à 20/1 s et 100/120 s puis **recalées sur les en-têtes** renvoyés. Sur 429 avec
  `Retry-After` : pause de tout l'hôte ; sans en-tête : pause 1 s puis 1 nouvel essai.
  **Deux niveaux de priorité** : `interactive` (recherche, historique) passe avant `background`
  (analyse des 100 parties).
- **Justification** : sans priorité, une recherche lancée pendant l'analyse attendrait jusqu'à
  2 min (violerait SC-001). Deux files suffisent, pas besoin de bibliothèque.
- **Alternatives** : bibliothèque (`bottleneck`, `p-queue`) — rejetée : ne connaît pas les en-têtes
  Riot, dépendance pour ~80 lignes de code.

## R9. Cache

- **Décision** : cache mémoire à durée de vie (TTL) dans le serveur :

| Donnée | TTL | Raison |
|---|---|---|
| Compte (Riot ID → PUUID) | 1 h | change rarement |
| Profil (icône, niveau) | 5 min | SC-002 |
| Liste des IDs de matchs | 5 min | SC-002 |
| Détail d'un match terminé | illimité (max 1 000 entrées, éviction la plus ancienne) | immuable |
| Versions Data Dragon, files (queues) | 6 h | change à chaque patch |

- **Justification** : principe II ; un `Map` + horodatage suffit pour une app locale mono-utilisateur.
- **Alternatives** : Redis / cache disque (rejeté, YAGNI).

## R10. Persistance de l'analyse (fichier JSON)

- **Décision** : interface `AnalysisStore` (`load(puuid)`, `save(analysis)`) + implémentation
  `JsonFileAnalysisStore` écrivant `data/analyses/{puuid}.json`. Écriture **atomique** (fichier
  temporaire puis `rename`) pour ne jamais corrompre le fichier si l'app s'arrête pendant
  l'écriture. `data/` est ignoré par git (contient des identifiants de joueurs).
- **Justification** : demandé par l'utilisateur ; ~100 parties × 10 joueurs ≈ quelques dizaines de
  Ko ; fichier lisible à l'œil. L'interface permet de passer à SQLite sans toucher au reste et
  d'utiliser un store en mémoire dans les tests.
- **Alternatives** : SQLite (rejeté pour l'instant, YAGNI) ; `localStorage` du navigateur (rejeté :
  le serveur calcule les badges).

## R11. Analyse longue et progression

- **Décision** : l'analyse tourne **dans le serveur** (tâche asynchrone en mémoire, une seule à la
  fois par compte de référence). `POST` la démarre (202), `GET` renvoie l'état ; l'interface
  interroge l'état **toutes les secondes** (polling) tant que l'analyse est en cours.
  Incrémental : on récupère les 100 derniers IDs (1 requête), on ne télécharge que ceux absents
  du fichier, on retire ceux sortis de la fenêtre des 100. La progression est sauvegardée tous
  les 10 matchs → une analyse interrompue reprend où elle s'était arrêtée.
- **Justification** : FR-012a/b ; le polling est trivial à tester, suffisant en local.
- **Alternatives** : Server-Sent Events / WebSocket (rejeté : plus complexe pour un gain nul ici).

## R12. Compte de référence (« moi »)

- **Décision** : stocké dans le `localStorage` du navigateur (`{ gameName, tagLine, platform, puuid }`)
  via un petit état réactif Svelte 5 (`reference.svelte.ts`) ; lecture/écriture protégées par
  `try/catch`. Les analyses sont stockées **par PUUID** côté serveur : changer de compte de
  référence puis revenir conserve l'ancienne analyse.
- **Justification** : FR-009 (« mémorisé sur l'appareil ») ; pas de compte utilisateur à gérer.

## R13. Données statiques (Data Dragon)

- **Décision** : version courante via `https://ddragon.leagueoflegends.com/api/versions.json` ([0]),
  icônes champion `.../cdn/{v}/img/champion/{championName}.png`, icônes de profil
  `.../cdn/{v}/img/profileicon/{id}.png`. Les URL d'images sont calculées par le serveur et
  incluses dans les réponses de notre API ; le navigateur charge les images directement depuis
  le CDN public (aucune clé en jeu). Libellés des modes : petite table française pour les files
  courantes (420, 440, 400, 430, 450, 490, 1700, 900…), repli sur `description` de
  `https://static.developer.riotgames.com/docs/lol/queues.json`.
- **Justification** : constitution (« données statiques via Data Dragon, hors API à quota »).

## R14. Stratégie de tests

- **Décision** :
  - **Projet Vitest `server`** (Node) : logique pure (Riot ID, routage, calcul des rencontres),
    limiteur (horloge injectée), client Riot et routes `+server.ts` avec **MSW 3**
    (`setupServer`, `onUnhandledFrame: 'error'` → tout appel réseau non simulé fait échouer le
    test). Fixtures JSON dans `tests/fixtures/riot/`.
  - **Projet Vitest `client`** (mode navigateur, Playwright Chromium — configuration par défaut de
    `sv`) : composants clés (validation du formulaire, badge, panneau de rencontres, messages
    d'erreur).
  - Pas de tests end-to-end automatisés dans cette feature (YAGNI) : validation manuelle via
    `quickstart.md`.
- **Pièges notés** : MSW 3 ne patche plus `setTimeout` (faux timers à avancer explicitement) ;
  ne pas combiner MSW avec `vi.stubGlobal('fetch')` ; MSW uniquement dans le projet Node.
- **Justification** : principe III (tests d'abord, API simulée, cas d'erreur couverts).

## R15. Mention légale Riot

- **Décision** : pied de page sur toutes les pages, texte **exact** exigé par Riot (en anglais),
  suivi de sa traduction :
  > LeagueApp isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games
  > or anyone officially involved in producing or managing Riot Games properties. Riot Games, and
  > all associated properties are trademarks or registered trademarks of Riot Games, Inc.
- **Politique** : une clé de développement sert au prototypage personnel ; « You may not maintain
  a public product with a development API key » → cohérent avec l'usage local (clarification Q1).

## R16. Clé invalide ou expirée

- **Constat** : la doc annonce 403, mais une clé inconnue renvoie en réalité **401 "Unknown
  apikey"** (sonde du 2026-10-20). → **401 et 403 sur tous les appels** sont traités comme « clé
  invalide ou expirée » : message serveur explicite (sans afficher la clé) + message utilisateur
  « Clé API Riot invalide ou expirée : régénère-la sur developer.riotgames.com ». Exception : un
  403 sur un **détail de match** pendant l'analyse = match indisponible (R6).

## Points non vérifiés (traités de façon défensive)

- Représentation exacte des bots (`"BOT"`) → détection défensive.
- Code exact d'une clé réellement expirée (401 attendu) → 401 et 403 traités pareil.
- Règles Unicode/espaces des Riot ID → validation par longueur seulement, encodage URL, pas de
  restriction ASCII.
