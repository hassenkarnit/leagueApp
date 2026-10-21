# Quickstart : valider la feature 003

**Prérequis** : `npm install`, `.env` avec une clé Riot valide (24 h), `npm run dev`.

## Tests automatiques

```bash
npm run test    # unitaires (ranked.ts) + composants (LiveTeamColumn, RankEmblem) + régression 002
npm run check && npm run lint
```

## Scénarios manuels (joueur en partie classée Solo/Duo)

1. **Emblèmes (US1)** — ouvrir un profil, cliquer « Actualiser la partie en cours » : chaque joueur
   classé affiche l'emblème de son palier à côté de son rang ; un joueur non classé a l'emblème
   neutre et « Non classé » (SC-001).
2. **Winrate coloré (US2)** — vérifier : ≤ 45 % rouge, 50 % jaune, ≥ 52 % vert, intermédiaires
   dégradés ; le pourcentage reste écrit (SC-003).
3. **Rang moyen (US3)** — sous le titre de chaque équipe, un rang moyen avec emblème. Vérifier à la
   main avec 2 joueurs Émeraude IV + 3 Émeraude I → « Émeraude II » (SC-004).
4. **Statistiques en chargement** — la composition s'affiche d'abord, le rang moyen passe de
   « calcul… » à sa valeur.
5. **Équipe incomplète** — avec des non classés : « (N/5 joueurs classés) » ; sans aucun classé :
   « Rang moyen indisponible ».
6. **Emblème cassé** — renommer un fichier de `static/ranks/` : le texte du rang reste visible.
7. **Quota** — dans l'onglet Réseau, aucune requête supplémentaire vers l'API par rapport à la 002
   (SC-005).
