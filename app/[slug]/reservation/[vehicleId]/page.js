import Header from "../../../../components/Header";
import ReservationForm from "../../../../components/ReservationForm";
import { getAgencyBySlug, getVehicle, getVehicleBlocks } from "../../../../lib/data";

export const dynamic = "force-dynamic";

export default async function ReservationPage({ params }) {
  const agency = await getAgencyBySlug(params.slug);
  if (!agency) return <main className="container"><div className="card"><h1>Agence introuvable</h1></div></main>;

  const vehicle = await getVehicle(agency.id, params.vehicleId);
  if (!vehicle) return <main className="container"><div className="card"><h1>Véhicule introuvable</h1></div></main>;

  const blocks = await getVehicleBlocks(agency.id, vehicle.id);

  return (
    <div className="page">
      <Header agency={agency} />
      <main className="container">
        <div className="section-head">
          <div>
            <h2>Réservation — {vehicle.name}</h2>
            <p>Remplissez votre demande. L’agence examinera les informations avant validation définitive.</p>
          </div>
        </div>
        <ReservationForm agency={agency} vehicle={vehicle} blocks={blocks} />
      </main>
    </div>
  );
}
