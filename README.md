# RentBase Site Client — version dynamique images corrigée

Version complète du site client RentBase.

Corrections incluses :
- pages dynamiques Next.js pour éviter les liens images expirés en cache ;
- route `/api/media` sans cache pour afficher les logos et photos véhicules ;
- fallback lien signé Supabase + fallback URL publique ;
- tunnel client complet : page agence, détail véhicule, réservation, demande envoyée, finalisation.

Après upload sur GitHub, attendre Vercel Ready puis faire CTRL+F5 sur le site.
