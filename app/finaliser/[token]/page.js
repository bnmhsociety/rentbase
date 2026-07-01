export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import FinalizeClient from "../../../components/FinalizeClient";
import { eur, fmtDateTime } from "../../../lib/helpers";
import { getRequestByToken } from "../../../lib/data";


export default async function FinalizePage({ params }) {
  const { token } = await params;
  const request = await getRequestByToken(token);

  if (!request) {
    return <main className="container" style={{ padding: 28 }}><div className="card"><h1>Lien introuvable</h1><p className="muted">Ce lien n’existe pas ou a expiré.</p></div></main>;
  }

  const agency = request.agencies;
  const vehicle = request.vehicles;
  const expired = request.acceptance_expires_at && new Date(request.acceptance_expires_at) < new Date();
  const remaining = Number(request.agency_remaining_amount || 0);
  const paymentLink = request.payment_link_url || agency?.website_stripe_payment_link || "";

  return (
    <div className="page">
      <main className="container success">
        <div className="card accepted">
          <h1>Finaliser votre réservation</h1>
          <p className="muted">Agence : {agency?.website_name || agency?.name}</p>

          {expired ? (
            <div className="notice no">Ce lien a expiré. Contactez l’agence pour une nouvelle validation.</div>
          ) : (
            <>
              <div className="card" style={{ boxShadow: "none", marginTop: 18 }}>
                <h2>{vehicle?.name || "Véhicule"}</h2>
                <div className="summary-list">
                  <div className="summary-line"><span>Départ</span><strong>{fmtDateTime(request.start_date, request.start_hour)}</strong></div>
                  <div className="summary-line"><span>Retour</span><strong>{fmtDateTime(request.end_date, request.end_hour)}</strong></div>
                  <div className="summary-line"><span>Total location</span><strong>{eur(request.agency_total_amount)}</strong></div>
                  <div className="summary-line"><span>Acompte à régler</span><strong>{eur(request.agency_deposit_amount)}</strong></div>
                  <div className="summary-line"><span>Reste jour J</span><strong>{eur(remaining)}</strong></div>
                  <div className="summary-line"><span>Caution jour J</span><strong>{eur(request.vehicle_deposit_amount || vehicle?.deposit_amount)}</strong></div>
                </div>
              </div>

              <div className="warning-red" style={{ marginTop: 18 }}>
                Caution obligatoire le jour du départ. L’acompte n’est pas remboursable si vous ne disposez pas de la caution le jour J ou en cas d’annulation après validation.
              </div>

              <FinalizeClient token={token} paymentLink={paymentLink} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
