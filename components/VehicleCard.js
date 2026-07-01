import { eur } from "../lib/helpers";

export default function VehicleCard({ slug, vehicle }) {
  return (
    <a className="vehicle-card" href={`/${slug}/vehicule/${vehicle.id}`}>
      {vehicle.imageUrl ? (
        <img className="vehicle-img" src={vehicle.imageUrl} alt={vehicle.name || "Véhicule"} />
      ) : (
        <div className="vehicle-img" />
      )}
      <div className="vehicle-body">
        <span className="badge">Disponible</span>
        <div className="vehicle-title">{vehicle.name || "Véhicule"}</div>
        <div className="vehicle-sub">
          {vehicle.brand || ""} {vehicle.model || ""} {vehicle.year ? `· ${vehicle.year}` : ""}
          {vehicle.plate ? ` · ${vehicle.plate}` : ""}
        </div>
        <div className="price-row">
          <div className="price-pill"><span>24h</span><strong>{eur(vehicle.price_per_day)}</strong></div>
          <div className="price-pill"><span>Caution</span><strong>{eur(vehicle.deposit_amount)}</strong></div>
          <div className="price-pill"><span>Acompte</span><strong>{eur(vehicle.booking_deposit_amount ?? 0)}</strong></div>
        </div>
        <span className="btn btn-primary" style={{ marginTop: "auto" }}>Voir le véhicule</span>
      </div>
    </a>
  );
}
