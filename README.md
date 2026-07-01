# RentBase site client complet — correction envoi demande mobile

Version corrigée pour l'erreur mobile :

- suppression de la validation native navigateur qui provoquait « The string did not match the expected pattern »
- email et téléphone passent en champs texte compatibles iPhone/Safari
- bouton d'envoi en type bouton, sans soumission HTML native
- fichiers envoyés avec nom sécurisé JPG/PNG/PDF pour éviter les noms iPhone incompatibles
- API d'envoi de demande plus robuste : la demande est créée même si l'email automatique échoue
- conservation des corrections images dynamiques Vercel/Supabase

Dézippez puis uploadez le contenu du dossier à la racine du dépôt GitHub.
