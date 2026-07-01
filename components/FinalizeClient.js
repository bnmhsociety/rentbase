"use client";

import { useState } from "react";

export default function FinalizeClient({ token, paymentLink }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function confirmPayment() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/finaliser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Erreur confirmation");
      setSuccess(true);
      setMessage("Votre réservation a été confirmée. L’agence a été informée.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ boxShadow: "none", marginTop: 18 }}>
      <h2>Paiement de l’acompte</h2>
      {paymentLink ? (
        <>
          <p className="muted">Cliquez sur le bouton pour régler l’acompte par carte. Revenez ensuite sur cette page pour confirmer.</p>
          <a className="btn btn-primary" href={paymentLink} target="_blank" rel="noreferrer" style={{ width: "100%", marginTop: 10 }}>
            Paiement par carte sécurisé
          </a>
        </>
      ) : (
        <>
          <p className="muted">Le paiement par carte sera activé prochainement par l’agence.</p>
          <button className="btn btn-primary" disabled style={{ width: "100%", marginTop: 10 }}>
            Paiement par carte bientôt disponible
          </button>
        </>
      )}

      <button className="btn btn-dark" onClick={confirmPayment} disabled={loading || success} style={{ width: "100%", marginTop: 12 }}>
        {success ? "Réservation confirmée" : loading ? "Confirmation..." : "J’ai réglé / confirmer ma réservation"}
      </button>
      {message ? <div className={`notice ${success ? "ok" : "no"}`}>{message}</div> : null}
    </div>
  );
}
