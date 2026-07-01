# RentBase site client V2 — correctif images proxy

Cette version corrige les logos/photos qui ne s'affichent pas en utilisant une route interne `/api/media`.

- Ne modifie pas Supabase.
- Ne nécessite pas de rendre le bucket public.
- Le site lit les images via Vercel côté serveur.

