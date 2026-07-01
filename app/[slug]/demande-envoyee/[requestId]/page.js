import Header from "../../../../components/Header";
import { eur, fmtDateTime } from "../../../../lib/helpers";
import { getRequestById } from "../../../../lib/data";

export const dynamic = "force-dynamic";

export default async function RequestSuccessPage({ params }) {
  const request = await getRequestById(params.requestId);
  if (!request) return <main className="container"><div className="card"><h1>Demande introuvable</h1></div></main>;

  const agency = request.agencies;
  const vehicle = request.vehicles;
  const paymentLabel = request.payment_choice === "carte" ? "Carte bancaire / paiement en ligne" : "En agence / espèces";

  return (
    <div className="page">
      <Header agency={agency} />
      <main className="container success">
        <div className="card">
          <div className="success-icon">✓</div>
          <h1>Demande envoyée</h1>
          <p className="muted">L’agence a reçu votre demande et vous contactera très bientôt.</p>

          <div className="card" style={{ boxShadow: "none", marginTop: 18 }}>
            <h2>Récapitulatif de votre demande</h2>
            <div className="summary-list">
              <div className="summary-line"><span>Agence</span><strong>{agency.website_name || agency.name}</strong></div>
              <div className="summary-line"><span>Véhicule</span><strong>{vehicle?.name || "Véhicule"}</strong></div>
              <div className="summary-line"><span>Client</span><strong>{request.first_name} {request.last_name}</strong></div>
              <div className="summary-line"><span>Départ</span><strong>{fmtDateTime(request.start_date)}</strong></div>
              <div className="summary-line"><span>Retour</span><strong>{fmtDateTime(request.end_date)}</strong></div>
              <div className="summary-line"><span>Mode de paiement souhaité</span><strong>{paymentLabel}</strong></div>
              <div className="summary-line"><span>Estimation 24h</span><strong>{eur(vehicle?.price_per_day)}</strong></div>
              <div className="summary-line"><span>Caution</span><strong>{eur(vehicle?.deposit_amount)}</strong></div>
            </div>
          </div>

          <div className="notice ok" style={{ marginTop: 18 }}>
            L’agence va examiner votre demande. Si elle accepte, vous recevrez un email avec le montant total, l’acompte à régler et le lien pour finaliser la réservation.
          </div>

          <a className="btn btn-primary" style={{ marginTop: 18 }} href={`/${agency.website_slug}`}>Retour aux véhicules</a>
        </div>
      </main>
    </div>
  );
}
