export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import Header from "../../../../components/Header";
import AvailabilityCalendar from "../../../../components/AvailabilityCalendar";
import { eur, normalizePhone, safeText } from "../../../../lib/helpers";
import { getAgencyBySlug, getVehicle, getVehicleBlocks } from "../../../../lib/data";


export default async function VehicleDetailPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const vehicleId = resolvedParams?.vehicleId;
  const agency = await getAgencyBySlug(slug);
  if (!agency) {
    return <main className="container" style={{ padding: 28 }}><div className="card"><h1>Agence introuvable</h1><p className="muted">Le lien de cette agence n’existe pas ou n’est pas encore activé.</p></div></main>;
  }

  const vehicle = await getVehicle(agency.id, vehicleId);
  if (!vehicle) {
    return <main className="container" style={{ padding: 28 }}><div className="card"><h1>Véhicule introuvable</h1><p className="muted">Ce véhicule n’est plus disponible sur le site.</p><a className="btn btn-primary" href={`/${agency.website_slug}`}>Retour aux véhicules</a></div></main>;
  }

  const blocks = await getVehicleBlocks(agency.id, vehicle.id);
  const phoneDigits = normalizePhone(agency.website_whatsapp || agency.website_phone || agency.phone);
  const whatsappUrl = phoneDigits ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Bonjour, je souhaite avoir des informations sur ${vehicle.name || "ce véhicule"}.`)}` : null;
  const contactHref = whatsappUrl || (agency.website_phone || agency.phone ? `tel:${agency.website_phone || agency.phone}` : `/${agency.website_slug}`);

  return (
    <div className="page vehicle-page">
      <Header agency={agency} />
      <main className="container">
        <div className="detail-layout">
          <div>
            {vehicle.imageUrl ? <img className="detail-image" src={vehicle.imageUrl} alt={vehicle.name || "Véhicule"} /> : <div className="detail-image placeholder-car">Photo véhicule</div>}
          </div>
          <div className="card">
            <span className="badge">Disponible à la demande</span>
            <h1 style={{ marginBottom: 4 }}>{safeText(vehicle.name, "Véhicule")}</h1>
            <p className="muted">
              {vehicle.brand || ""} {vehicle.model || ""}
              {vehicle.year ? ` · ${vehicle.year}` : ""}
              {vehicle.power ? ` · ${vehicle.power} ch` : ""}
            </p>

            <div className="specs">
              <div className="spec"><span>Prix 24h</span><strong>{eur(vehicle.price_per_day)}</strong></div>
              <div className="spec"><span>Caution</span><strong>{eur(vehicle.deposit_amount)}</strong></div>
              <div className="spec"><span>Année</span><strong>{vehicle.year || "—"}</strong></div>
              <div className="spec"><span>Puissance</span><strong>{vehicle.power ? `${vehicle.power} ch` : "—"}</strong></div>
            </div>

            {vehicle.description ? <p className="muted" style={{ marginTop: 14 }}>{vehicle.description}</p> : null}
          </div>
        </div>

        <div className="section-head">
          <div>
            <h2>Calendrier de disponibilité</h2>
            <p>Visualisez les périodes déjà réservées avant d’envoyer votre demande.</p>
          </div>
        </div>
        <AvailabilityCalendar blocks={blocks} />
      </main>

      <div className="bottom-bar">
        <div className="bottom-inner container">
          <div className="bottom-price"><span>Prix 24h</span><strong>{eur(vehicle.price_per_day)}</strong></div>
          <div className="bottom-actions">
            <a className="round-contact" href={contactHref} aria-label="Contacter l’agence">💬</a>
            <a className="btn btn-primary" href={`/${agency.website_slug || slug}/reservation/${encodeURIComponent(vehicle.id)}`}>Réserver</a>
          </div>
        </div>
      </div>
    </div>
  );
}
