# RentBase — site client complet propre

Ce dossier remplace entièrement le site public RentBase.

## Pages incluses

- `/${slug}` : page agence avec véhicules.
- `/${slug}/vehicule/${vehicleId}` : page détail véhicule avec photo, caractéristiques, prix 24h, caution, acompte, calendrier et barre fixe contact/réserver.
- `/${slug}/reservation/${vehicleId}` : tunnel de demande avec dates obligatoires, coordonnées, documents, mode de paiement souhaité et message optionnel.
- `/${slug}/demande-envoyee/${requestId}` : page confirmation + récapitulatif.
- `/finaliser/${token}` : page de finalisation après acceptation agence, lien 72h, acompte, caution et bouton paiement carte prêt.

## Variables Vercel obligatoires

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` ou ta clé `sb_secret_...`

## Variables Vercel optionnelles pour les emails

- `RESEND_API_KEY`
- `MAIL_FROM`

Si Resend n'est pas configuré, les demandes s'envoient quand même dans Supabase mais aucun email automatique ne part.

## Upload GitHub

Glisse le contenu de ce dossier directement à la racine du dépôt GitHub. La racine doit afficher :

- `app`
- `components`
- `lib`
- `package.json`
- `README.md`
- `supabase_site_client_complet.sql`

## SQL Supabase conseillé

Lance le fichier `supabase_site_client_complet.sql` si certaines colonnes manquent dans `booking_requests`.
