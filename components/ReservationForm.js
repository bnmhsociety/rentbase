"use client";

import { useMemo, useState } from "react";

function eur(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€`;
}

function toIso(date, hour) {
  if (!date) return null;
  const d = new Date(`${date}T${hour || "09:00"}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function rentalDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function overlap(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return false;
  return new Date(endA) > new Date(startB) && new Date(startA) < new Date(endB);
}

export default function ReservationForm({ agency, vehicle, blocks }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [docsReady, setDocsReady] = useState(false);
  const [form, setForm] = useState({
    start_date: "",
    start_hour: "09:00",
    end_date: "",
    end_hour: "18:00",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    zip_code: "",
    city: "",
    payment_choice: "",
    request_message: "",
  });

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const startISO = useMemo(() => toIso(form.start_date, form.start_hour), [form.start_date, form.start_hour]);
  const endISO = useMemo(() => toIso(form.end_date, form.end_hour), [form.end_date, form.end_hour]);
  const days = useMemo(() => rentalDays(startISO, endISO), [startISO, endISO]);
  const total = days * Number(vehicle.price_per_day || 0);

  const datesFilled = !!form.start_date && !!form.end_date && !!form.start_hour && !!form.end_hour;
  const dateOrderOk = datesFilled && startISO && endISO && new Date(endISO) > new Date(startISO);
  const hasConflict = dateOrderOk && (blocks || []).some((block) => overlap(startISO, endISO, block.start_date, block.end_date));
  const datesAvailable = dateOrderOk && !hasConflict;

  const identityFilled = [form.first_name, form.last_name, form.email, form.phone, form.address, form.zip_code, form.city]
    .every((v) => String(v || "").trim());

  const canUploadDocs = datesAvailable && identityFilled;

  function getFile(id) {
    return typeof document !== "undefined" ? document.getElementById(id)?.files?.[0] : null;
  }

  function refreshDocsReady() {
    setTimeout(() => {
      const ok = ["license_front", "license_back", "id_front", "id_back", "address_proof"].every((id) => !!getFile(id));
      setDocsReady(ok);
    }, 0);
  }

  const canSend = datesAvailable && identityFilled && docsReady && !!form.payment_choice;

  async function submit(e) {
    e.preventDefault();
    if (!canSend || sending) return;

    setSending(true);
    setMessage("");

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("agency_id", agency.id);
      fd.append("vehicle_id", vehicle.id);
      fd.append("total_amount", String(total));
      fd.append("rental_days", String(days));
      fd.append("vehicle_deposit_amount", String(vehicle.deposit_amount || 0));
      fd.append("deposit_amount", String(vehicle.booking_deposit_amount || 0));
      fd.append("license_front", getFile("license_front"));
      fd.append("license_back", getFile("license_back"));
      fd.append("id_front", getFile("id_front"));
      fd.append("id_back", getFile("id_back"));
      fd.append("address_proof", getFile("address_proof"));

      const res = await fetch("/api/booking-requests", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Erreur envoi demande");
      }

      window.location.href = `/${agency.website_slug}/demande-envoyee/${data.id}`;
    } catch (err) {
      setMessage(err.message);
      setSending(false);
    }
  }

  return (
    <form id="reservation-form" onSubmit={submit} className="form-layout">
      <div style={{ display: "grid", gap: 14 }}>
        <div className="card">
          <h2>Choisissez vos dates</h2>
          <p className="muted">Les dates et heures doivent être remplies avant de pouvoir continuer.</p>

          <div className="form-grid" style={{ marginTop: 14 }}>
            <div className="field"><label>Date départ</label><input className="input" type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} required /></div>
            <div className="field"><label>Heure départ</label><input className="input" type="time" value={form.start_hour} onChange={(e) => update("start_hour", e.target.value)} required /></div>
            <div className="field"><label>Date retour</label><input className="input" type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} required /></div>
            <div className="field"><label>Heure retour</label><input className="input" type="time" value={form.end_hour} onChange={(e) => update("end_hour", e.target.value)} required /></div>
          </div>

          {!datesFilled ? <div className="notice wait">Remplissez les dates pour vérifier la disponibilité.</div> : null}
          {datesFilled && !dateOrderOk ? <div className="notice no">La date de retour doit être après la date de départ.</div> : null}
          {dateOrderOk && hasConflict ? <div className="notice no">Indisponible : une réservation existe déjà sur cette période.</div> : null}
          {datesAvailable ? <div className="notice ok">Disponible : vous pouvez continuer votre demande.</div> : null}
        </div>

        <div className={`card ${!datesAvailable ? "block-disabled" : ""}`}>
          <h2>Vos coordonnées</h2>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <div className="field"><label>Prénom</label><input className="input" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required={datesAvailable} /></div>
            <div className="field"><label>Nom</label><input className="input" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required={datesAvailable} /></div>
            <div className="field"><label>Email</label><input className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required={datesAvailable} /></div>
            <div className="field"><label>Téléphone</label><input className="input" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} required={datesAvailable} /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label>Adresse</label><input className="input" value={form.address} onChange={(e) => update("address", e.target.value)} required={datesAvailable} /></div>
            <div className="field"><label>Code postal</label><input className="input" value={form.zip_code} onChange={(e) => update("zip_code", e.target.value)} required={datesAvailable} /></div>
            <div className="field"><label>Ville</label><input className="input" value={form.city} onChange={(e) => update("city", e.target.value)} required={datesAvailable} /></div>
          </div>
        </div>

        <div className={`card ${!canUploadDocs ? "block-disabled" : ""}`}>
          <h2>Documents</h2>
          <p className="muted">Ajoutez les photos ou fichiers demandés.</p>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <div className="field"><label>Permis recto</label><input className="file" id="license_front" type="file" accept="image/*,.pdf" onChange={refreshDocsReady} required={canUploadDocs} /></div>
            <div className="field"><label>Permis verso</label><input className="file" id="license_back" type="file" accept="image/*,.pdf" onChange={refreshDocsReady} required={canUploadDocs} /></div>
            <div className="field"><label>Carte ID recto</label><input className="file" id="id_front" type="file" accept="image/*,.pdf" onChange={refreshDocsReady} required={canUploadDocs} /></div>
            <div className="field"><label>Carte ID verso</label><input className="file" id="id_back" type="file" accept="image/*,.pdf" onChange={refreshDocsReady} required={canUploadDocs} /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label>Justificatif de domicile</label><input className="file" id="address_proof" type="file" accept="image/*,.pdf" onChange={refreshDocsReady} required={canUploadDocs} /></div>
          </div>
        </div>

        <div className={`card ${!canUploadDocs ? "block-disabled" : ""}`}>
          <h2>Comment souhaitez-vous payer ?</h2>
          <div className="payment-choice" style={{ marginTop: 14 }}>
            <button type="button" className={`choice ${form.payment_choice === "agence" ? "active" : ""}`} onClick={() => update("payment_choice", "agence")}>
              <strong>En agence</strong><span>Espèces à régler sur place</span>
            </button>
            <button type="button" className={`choice ${form.payment_choice === "carte" ? "active" : ""}`} onClick={() => update("payment_choice", "carte")}>
              <strong>Par carte</strong><span>Paiement en ligne sécurisé</span>
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>L’agence pourra vous proposer un autre mode de paiement si nécessaire.</p>
        </div>

        <div className={`card ${!canUploadDocs ? "block-disabled" : ""}`}>
          <h2>Message optionnel</h2>
          <textarea className="textarea" value={form.request_message} onChange={(e) => update("request_message", e.target.value)} placeholder="Votre message pour l’agence..." />
        </div>
      </div>

      <aside className="card recap-card">
        <h2>Récapitulatif</h2>
        <div className="summary-list">
          <div className="summary-line"><span>Véhicule</span><strong>{vehicle.name}</strong></div>
          <div className="summary-line"><span>Départ</span><strong>{form.start_date || "—"} {form.start_hour}</strong></div>
          <div className="summary-line"><span>Retour</span><strong>{form.end_date || "—"} {form.end_hour}</strong></div>
          <div className="summary-line"><span>Jours estimés</span><strong>{days || "—"}</strong></div>
          <div className="summary-line"><span>Prix estimé</span><strong>{eur(total)}</strong></div>
          <div className="summary-line"><span>Acompte</span><strong>À définir par l’agence</strong></div>
          <div className="summary-line"><span>Caution</span><strong>{eur(vehicle.deposit_amount)}</strong></div>
        </div>
        {message ? <div className="notice no">{message}</div> : null}
      </aside>

      <div className="reservation-submit-bar">
        <div className="container reservation-submit-inner">
          <div>
            <span>Demande</span>
            <strong>{canSend ? "Prête à envoyer" : "Complétez les informations"}</strong>
          </div>
          <button className="btn btn-primary" disabled={!canSend || sending} type="submit">
            {sending ? "Envoi..." : "Envoyer ma demande"}
          </button>
        </div>
      </div>
    </form>
  );
}
