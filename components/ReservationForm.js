"use client";

import { useMemo, useState } from "react";

function eur(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function normalizeHour(value, fallback = "09:00") {
  const raw = String(value || fallback).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return `${pad2(h)}:${pad2(m)}`;
}

function toIso(date, hour) {
  const value = String(date || "").slice(0, 10);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [h, m] = normalizeHour(hour || "09:00").split(":").map(Number);
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), h, m, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function dateKey(date) {
  if (!date) return "";
  if (typeof date === "string") {
    const value = date.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date || "").slice(0, 10);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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

function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function monthCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const firstDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function dayBusyClass(date, blocks) {
  if (!date) return "";
  const key = dateKey(date);
  let busyStart = false;
  let busyEnd = false;
  let busyFull = false;

  (blocks || []).forEach((block) => {
    const start = dateKey(block.start_date);
    const end = dateKey(block.end_date);
    if (!start || !end) return;

    if (key === start && key === end) {
      busyStart = true;
      busyEnd = true;
      return;
    }

    if (key === start) busyStart = true;
    if (key === end) busyEnd = true;
    if (key > start && key < end) busyFull = true;
  });

  if (busyFull || (busyStart && busyEnd)) return "busy-both";
  if (busyStart) return "busy-start";
  if (busyEnd) return "busy-end";
  return "";
}

function ReservationDateCalendar({ blocks, startDate, endDate, onPick }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const cells = useMemo(() => monthCells(month), [month]);
  const today = dateKey(new Date());

  function pick(date) {
    if (!date) return;
    const key = dateKey(date);
    if (key < today) return;
    const busy = dayBusyClass(date, blocks);
    if (busy === "busy-both") return;
    onPick(key);
  }

  return (
    <div className="date-picker">
      <div className="date-picker-top">
        <button type="button" className="month-btn" onClick={() => setMonth(addMonths(month, -1))}>‹</button>
        <strong>{month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</strong>
        <button type="button" className="month-btn" onClick={() => setMonth(addMonths(month, 1))}>›</button>
      </div>

      <div className="calendar-head">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className="calendar-grid calendar-select-grid">
        {cells.map((date, index) => {
          const key = date ? dateKey(date) : "";
          const busy = dayBusyClass(date, blocks);
          const isPast = date && key < today;
          const selectedStart = key && key === startDate;
          const selectedEnd = key && key === endDate;
          const inRange = key && startDate && endDate && key > startDate && key < endDate;
          const disabled = !date || isPast || busy === "busy-both";

          return (
            <button
              type="button"
              key={`${key || 'empty'}-${index}`}
              className={`day date-btn ${!date ? "empty" : ""} ${busy} ${selectedStart ? "selected-start" : ""} ${selectedEnd ? "selected-end" : ""} ${inRange ? "selected-range" : ""} ${isPast ? "past" : ""}`}
              disabled={disabled}
              onClick={() => pick(date)}
            >
              <span>{date ? date.getDate() : ""}</span>
            </button>
          );
        })}
      </div>

      <div className="legend">
        <span><i /> Disponible</span>
        <span><i className="red" /> Déjà réservé</span>
        <span><i className="blue" /> Votre sélection</span>
      </div>
    </div>
  );
}


const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  return `${pad2(hour)}:${minute}`;
});

function TimeSelect({ label, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select className="input" value={normalizeHour(value)} onChange={(e) => onChange(e.target.value)}>
        {TIME_OPTIONS.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
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
    const nextValue = key === "start_hour" || key === "end_hour" ? normalizeHour(value) : value;
    setForm((prev) => ({ ...prev, [key]: nextValue }));
  }

  function pickCalendarDate(key) {
    if (!form.start_date || (form.start_date && form.end_date)) {
      setForm((prev) => ({ ...prev, start_date: key, end_date: "" }));
      return;
    }

    if (key <= form.start_date) {
      setForm((prev) => ({ ...prev, start_date: key, end_date: "" }));
      return;
    }

    setForm((prev) => ({ ...prev, end_date: key }));
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

  function safeUploadFileName(file, fallback) {
    const original = String(file?.name || fallback || "document").trim();
    const parts = original.split(".");
    const ext = parts.length > 1 ? parts.pop().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "jpg";
    const base = parts.join(".") || fallback || "document";
    const cleanBase = base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || fallback || "document";
    return `${cleanBase}.${ext || "jpg"}`;
  }

  function refreshDocsReady() {
    setTimeout(() => {
      const ok = ["license_front", "license_back", "id_front", "id_back", "address_proof"].every((id) => !!getFile(id));
      setDocsReady(ok);
    }, 0);
  }

  const canSend = datesAvailable && identityFilled && docsReady && !!form.payment_choice;

  async function submit(e) {
    e?.preventDefault?.();
    if (!canSend || sending) return;

    setSending(true);
    setMessage("");

    try {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email || "").trim());
      if (!emailOk) throw new Error("Adresse email invalide.");

      const files = {
        license_front: getFile("license_front"),
        license_back: getFile("license_back"),
        id_front: getFile("id_front"),
        id_back: getFile("id_back"),
        address_proof: getFile("address_proof"),
      };

      if (Object.values(files).some((file) => !file || !file.size)) {
        throw new Error("Tous les documents sont obligatoires.");
      }

      const fd = new FormData();
      Object.entries({
        ...form,
        start_hour: normalizeHour(form.start_hour, "09:00"),
        end_hour: normalizeHour(form.end_hour, "18:00"),
      }).forEach(([k, v]) => fd.append(k, String(v || "")));
      fd.append("agency_id", String(agency.id || ""));
      fd.append("vehicle_id", String(vehicle.id || ""));
      fd.append("total_amount", String(total));
      fd.append("rental_days", String(days));
      fd.append("vehicle_deposit_amount", String(vehicle.deposit_amount || 0));
      fd.append("deposit_amount", String(vehicle.booking_deposit_amount || 0));
      Object.entries(files).forEach(([key, file]) => fd.append(key, file, safeUploadFileName(file, key)));

      const res = await fetch("/api/booking-requests", { method: "POST", body: fd, cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Erreur envoi demande");
      }

      const slug = String(agency.website_slug || "").trim();
      if (!slug || !data?.id) throw new Error("Redirection impossible après création de la demande.");
      window.location.assign(`/${encodeURIComponent(slug)}/demande-envoyee/${encodeURIComponent(String(data.id))}`);
    } catch (err) {
      const rawMessage = String(err?.message || err || "Erreur pendant l’envoi.");
      const friendlyMessage = rawMessage.toLowerCase().includes("expected pattern") || rawMessage.toLowerCase().includes("match the expected")
        ? "Erreur pendant l’envoi des documents. Réessayez avec des photos simples prises depuis votre galerie, ou choisissez des fichiers JPG/PNG/PDF."
        : rawMessage;
      setMessage(friendlyMessage);
      setSending(false);
    }
  }

  return (
    <form id="reservation-form" onSubmit={submit} className="form-layout" noValidate>
      <div style={{ display: "grid", gap: 14 }}>
        <div className="card">
          <h2>Choisissez vos dates</h2>
          <p className="muted">Sélectionnez une date de départ puis une date de retour dans le calendrier.</p>

          <ReservationDateCalendar
            blocks={blocks}
            startDate={form.start_date}
            endDate={form.end_date}
            onPick={pickCalendarDate}
          />

          <div className="selected-dates-card">
            <div className="selected-date-line"><span>Départ</span><strong>{form.start_date || "Choisir sur le calendrier"}</strong></div>
            <div className="selected-date-line"><span>Retour</span><strong>{form.end_date || "Choisir sur le calendrier"}</strong></div>
          </div>

          <div className="form-grid" style={{ marginTop: 14 }}>
            <TimeSelect label="Heure départ" value={form.start_hour} onChange={(value) => update("start_hour", value)} />
            <TimeSelect label="Heure retour" value={form.end_hour} onChange={(value) => update("end_hour", value)} />
          </div>

          {!datesFilled ? <div className="notice wait">Choisissez les dates pour vérifier la disponibilité.</div> : null}
          {datesFilled && !dateOrderOk ? <div className="notice no">La date de retour doit être après la date de départ.</div> : null}
          {dateOrderOk && hasConflict ? <div className="notice no">Indisponible : une réservation existe déjà sur cette période.</div> : null}
          {datesAvailable ? <div className="notice ok">Disponible : vous pouvez continuer votre demande.</div> : null}
        </div>

        <div className={`card ${!datesAvailable ? "block-disabled" : ""}`}>
          <h2>Vos coordonnées</h2>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <div className="field"><label>Prénom</label><input className="input" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} autoComplete="given-name" /></div>
            <div className="field"><label>Nom</label><input className="input" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} autoComplete="family-name" /></div>
            <div className="field"><label>Email</label><input className="input" type="text" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></div>
            <div className="field"><label>Téléphone</label><input className="input" type="text" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label>Adresse</label><input className="input" value={form.address} autoComplete="street-address" onChange={(e) => update("address", e.target.value)} /></div>
            <div className="field"><label>Code postal</label><input className="input" value={form.zip_code} inputMode="numeric" autoComplete="postal-code" onChange={(e) => update("zip_code", e.target.value)} /></div>
            <div className="field"><label>Ville</label><input className="input" value={form.city} autoComplete="address-level2" onChange={(e) => update("city", e.target.value)} /></div>
          </div>
        </div>

        <div className={`card ${!canUploadDocs ? "block-disabled" : ""}`}>
          <h2>Documents</h2>
          <p className="muted">Ajoutez les photos ou fichiers demandés.</p>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <div className="field"><label>Permis recto</label><input className="file" id="license_front" type="file" accept="image/*,application/pdf" onChange={refreshDocsReady} /></div>
            <div className="field"><label>Permis verso</label><input className="file" id="license_back" type="file" accept="image/*,application/pdf" onChange={refreshDocsReady} /></div>
            <div className="field"><label>Carte ID recto</label><input className="file" id="id_front" type="file" accept="image/*,application/pdf" onChange={refreshDocsReady} /></div>
            <div className="field"><label>Carte ID verso</label><input className="file" id="id_back" type="file" accept="image/*,application/pdf" onChange={refreshDocsReady} /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label>Justificatif de domicile</label><input className="file" id="address_proof" type="file" accept="image/*,application/pdf" onChange={refreshDocsReady} /></div>
          </div>
        </div>

        <div className={`card payment-card ${!canUploadDocs ? "block-disabled" : ""}`}>
          <h2>Comment souhaitez-vous payer ?</h2>
          <div className="payment-choice" style={{ marginTop: 14 }}>
            <button type="button" className={`choice ${form.payment_choice === "agence" ? "active" : ""}`} onClick={() => update("payment_choice", "agence")}>
              <span className="choice-icon">🏢</span>
              <span><strong>En agence</strong><em>Espèces à régler sur place</em></span>
            </button>
            <button type="button" className={`choice ${form.payment_choice === "carte" ? "active" : ""}`} onClick={() => update("payment_choice", "carte")}>
              <span className="choice-icon">💳</span>
              <span><strong>Par carte</strong><em>Paiement en ligne sécurisé</em></span>
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
        <div className="container reservation-submit-inner single-submit">
          <button className="btn btn-primary submit-wide" disabled={!canSend || sending} type="button" onClick={submit}>
            {sending ? "Envoi..." : "Envoyer ma demande"}
          </button>
        </div>
      </div>
    </form>
  );
}
