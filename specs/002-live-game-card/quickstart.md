# Quickstart : valider la feature 002-live-game-card

Prérequis, installation et commandes de test : identiques à la feature 001
([../001-historique-joueur/quickstart.md](../001-historique-joueur/quickstart.md)).
Contrat des nouveaux endpoints : [contracts/api.openapi.yaml](./contracts/api.openapi.yaml).

## Vérifications automatiques

```bash
npm run test && npm run check && npm run lint
```

## Trouver un joueur en partie classée

Le plus simple : **ta propre partie**, pendant l'écran de chargement d'une classée Solo/Duo.
À défaut, un joueur très actif (haut du classement Challenger de ton serveur sur un site public).

## Scénarios de validation manuelle

| # | Action | Résultat attendu | Spec |
|---|---|---|---|
| 1 | Ouvrir un profil | Seul le bouton « Actualiser la partie en cours » apparaît, aucune requête de partie en cours | FR-001, US1-1 |
| 2 | Cliquer sur le bouton pour un joueur hors partie | « Pas de partie classée Solo/Duo en cours » en < 3 s | FR-003, SC-001 |
| 3 | Cliquer pour un joueur en ARAM / normale | « En partie (ARAM), pas en classée Solo/Duo » | FR-003, US1-6 |
| 4 | Cliquer pour un joueur en classée Solo/Duo | Card pleine largeur, 2 équipes de 5 visibles sans dépliage, Riot ID + champion | FR-002, FR-005, FR-006 |
| 5 | Observer la durée | Elle avance chaque seconde ; « Écran de chargement » si la partie n'a pas démarré | FR-004 |
| 6 | Observer les statistiques | Rang (« Platine II · 45 LP »), « 54 % · 120 V / 102 D » ou « Non classé », en < 5 s | FR-012 à FR-014, SC-002 |
| 7 | Vérifier un pourcentage à la main | victoires ÷ (victoires + défaites), arrondi | SC-006 |
| 8 | Avec ton compte « Moi » analysé, sur ta propre partie | Badges `👥 N` sur les joueurs déjà croisés, « C'est vous » sur toi | FR-009, US2 |
| 9 | Cliquer sur un joueur de la card | Panneau « parties communes » | FR-010 |
| 10 | Cliquer sur ↗ d'un joueur | Son profil s'ouvre | FR-011 |
| 11 | Recliquer sur « Actualiser » dans les 10 min | Card mise à jour, statistiques instantanées (cache) | FR-016 |
| 12 | Le joueur consulté | Mis en évidence dans la card | FR-007 |
| 13 | Fausse clé dans `.env` puis clic | Message clair, profil et historique toujours affichés | FR-008 |
| 14 | Aucune card ni bannissement, sort, rune | Absents | FR-006 |
