# RentBase Public Site

Site web public pour les agences RentBase.

## Installation

```bash
npm install
npm run dev
```

## Variables d'environnement

Créer un fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://kbwjtstwjwwtcaroohid.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TON_ANON_KEY_OU_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=TA_SERVICE_ROLE_KEY_SEULEMENT_COTE_SERVER
```

Important : ne mets jamais `SUPABASE_SERVICE_ROLE_KEY` dans Snack Expo ou dans un code public côté client.

## URL de test

Après lancement :

```txt
http://localhost:3000/ton-slug-agence
```

Le slug doit être le même que celui enregistré dans l'app RentBase : `website_slug`.
