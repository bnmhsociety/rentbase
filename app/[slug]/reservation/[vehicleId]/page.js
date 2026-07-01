import Header from "../../../../components/Header";
import ReservationForm from "../../../../components/ReservationForm";
import { getAgencyBySlug, getVehicle, getVehicleBlocks } from "../../../../lib/data";

export const dynamic = "force-dynamic";

export default async function ReservationPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const vehicleId = resolvedParams?.vehicleId;
  const agency = await getAgencyBySlug(slug);
  if (!agency) return <main className="container" style={{ padding: 28 }}><div className="card"><h1>Agence introuvable</h1></div></main>;

  const vehicle = await getVehicle(agency.id, vehicleId);
  if (!vehicle) return <main className="container" style={{ padding: 28 }}><div className="card"><h1>Véhicule introuvable</h1></div></main>;

  const blocks = await getVehicleBlocks(agency.id, vehicle.id);

  return (
    <div className="page reservation-page">
      <Header agency={agency} />
      <main className="container">
        <div className="section-head">
          <div>
            <h2>Réserver — {vehicle.name}</h2>
            <p>Envoyez votre demande. L’agence examinera votre dossier avant validation définitive.</p>
          </div>
        </div>
        <ReservationForm agency={agency} vehicle={vehicle} blocks={blocks} />
      </main>
    </div>
  );
}
