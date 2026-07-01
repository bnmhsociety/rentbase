export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import Header from "../../components/Header";
import VehicleCard from "../../components/VehicleCard";
import { getAgencyBySlug, getVehiclesForAgency } from "../../lib/data";


export default async function AgencyPage({ params }) {
  const { slug } = await params;
  const agency = await getAgencyBySlug(slug);

  if (!agency) {
    return (
      <main className="container" style={{ padding: 30 }}>
        <div className="card">
          <h1>Agence introuvable</h1>
          <p className="muted">Le lien de cette agence n’existe pas ou n’est pas encore activé.</p>
        </div>
      </main>
    );
  }

  const allVehicles = await getVehiclesForAgency(agency.id);
  const vehicles = allVehicles.filter((v) => String(v.status || "Disponible") !== "Maintenance");

  return (
    <div className="page">
      <Header agency={agency} />
      <main className="container">
        <section className="hero">
          <h1>{agency.website_name || agency.name}</h1>
          <p>{agency.website_intro || "Choisissez votre véhicule, vérifiez les disponibilités et envoyez votre demande de réservation en quelques minutes."}</p>
        </section>

        <div className="section-head" id="vehicules">
          <div>
            <h2>Véhicules disponibles</h2>
            <p>{vehicles.length} véhicule(s) présenté(s)</p>
          </div>
        </div>

        {vehicles.length === 0 ? (
          <div className="card"><p className="muted">Aucun véhicule disponible pour le moment.</p></div>
        ) : (
          <div className="grid">
            {vehicles.map((vehicle) => <VehicleCard key={vehicle.id} slug={agency.website_slug || slug} vehicle={vehicle} />)}
          </div>
        )}
      </main>
    </div>
  );
}
