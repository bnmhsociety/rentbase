import Header from "../../../../components/Header";
import AvailabilityCalendar from "../../../../components/AvailabilityCalendar";
import { eur, normalizePhone } from "../../../../lib/helpers";
import { getAgencyBySlug, getVehicle, getVehicleBlocks } from "../../../../lib/data";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({ params }) {
  const agency = await getAgencyBySlug(params.slug);
  if (!agency) return <main className="container"><div className="card"><h1>Agence introuvable</h1></div></main>;

  const vehicle = await getVehicle(agency.id, params.vehicleId);
  if (!vehicle) return <main className="container"><div className="card"><h1>Véhicule introuvable</h1></div></main>;

  const blocks = await getVehicleBlocks(agency.id, vehicle.id);
  const phoneDigits = normalizePhone(agency.website_whatsapp || agency.website_phone || agency.phone);
  const whatsappUrl = phoneDigits ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Bonjour, je souhaite avoir des informations sur ${vehicle.name || "ce véhicule"}.`)}` : null;

  return (
    <div className="page">
      <Header agency={agency} />
      <main className="container">
        <div className="detail-layout">
          <div>
            {vehicle.imageUrl ? <img className="detail-image" src={vehicle.imageUrl} alt={vehicle.name || "Véhicule"} /> : <div className="detail-image" />}
          </div>
          <div className="card">
            <span className="badge">Disponible à la demande</span>
            <h1 style={{ marginBottom: 4 }}>{vehicle.name || "Véhicule"}</h1>
            <p className="muted">{vehicle.brand || ""} {vehicle.model || ""} {vehicle.year ? `· ${vehicle.year}` : ""}</p>

            <div className="specs">
              <div className="spec"><span>Prix 24h</span><strong>{eur(vehicle.price_per_day)}</strong></div>
              <div className="spec"><span>Caution</span><strong>{eur(vehicle.deposit_amount)}</strong></div>
              <div className="spec"><span>Acompte</span><strong>{eur(vehicle.booking_deposit_amount ?? 0)}</strong></div>
              <div className="spec"><span>Plaque</span><strong>{vehicle.plate || "—"}</strong></div>
              <div className="spec"><span>Kilométrage</span><strong>{vehicle.mileage ? `${vehicle.mileage} km` : "—"}</strong></div>
              <div className="spec"><span>Statut</span><strong>{vehicle.status || "Disponible"}</strong></div>
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
            {whatsappUrl ? <a className="round-contact" href={whatsappUrl} target="_blank">💬</a> : null}
            {agency.phone ? <a className="round-contact" href={`tel:${agency.phone}`}>☎</a> : null}
            <a className="btn btn-primary" href={`/${params.slug}/reservation/${vehicle.id}`}>Réserver</a>
          </div>
        </div>
      </div>
    </div>
  );
}
