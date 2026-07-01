# RentBase — site public propre

Version propre du tunnel client :

- Page agence : liste des véhicules
- Page véhicule : photo, caractéristiques, prix 24h, caution, acompte, calendrier disponibilité
- Page réservation : dates obligatoires, coordonnées, documents, mode de paiement souhaité, message optionnel
- Page demande envoyée : récapitulatif client
- Page finaliser : lien 72h après acceptation agence

## Variables Vercel nécessaires

Obligatoires :

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Optionnelles pour envoyer l’email “Demande reçue” :

- RESEND_API_KEY
- MAIL_FROM

Sans Resend, la demande s’envoie quand même dans Supabase, mais aucun email automatique n’est envoyé.

## Important

Le paiement carte est préparé côté page finalisation, mais désactivé pour l’instant. Il sera activé plus tard avec Stripe Checkout.
