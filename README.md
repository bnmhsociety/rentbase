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
