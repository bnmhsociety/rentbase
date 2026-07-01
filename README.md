# RentBase site client complet — correctif iPhone FormData

Version corrigée après erreur mobile : « The string did not match the expected pattern ».

Corrections incluses :
- Suppression du 3e argument `filename` dans FormData.append, qui peut faire planter iPhone/Safari.
- URL API absolue côté navigateur.
- Envoi sans option cache sur POST multipart.
- Sécurisation du content-type fichier côté serveur.
- Sécurisation du chemin Storage côté serveur.
- Messages d’erreur français plus clairs.
- Conservation des corrections images dynamiques.

Dézippez puis uploadez le contenu du dossier à la racine du dépôt GitHub.


## Correctif ajouté
- Compression automatique des photos iPhone avant l’envoi de la demande.
- Message d’erreur plus précis si Vercel bloque un fichier trop lourd.
- Garde les corrections images dynamiques déjà ajoutées.


## Correctif vitesse + email client

Cette version accélère l’envoi de demande :
- compression des 5 documents en parallèle côté téléphone ;
- upload des 5 documents en parallèle côté serveur ;
- compression plus légère pour les photos iPhone ;
- l’email ne bloque plus longtemps la redirection client.

Pour que le client reçoive l’email de récapitulatif, configure ces variables dans Vercel :

```txt
RESEND_API_KEY=ta_cle_resend
MAIL_FROM=RentBase <contact@ton-domaine-verifie.fr>
```

Après modification des variables Vercel :
1. Sauvegarder les variables.
2. Redeploy.
3. Tester avec une vraie adresse email client.

Si le mail n’arrive pas : ouvre Vercel > Logs et cherche : `Email demande reçue non envoyé`. Le log dira si `RESEND_API_KEY` ou `MAIL_FROM` manque.
