"use client";

import { useMemo, useState } from "react";
import { submitPublicBookingRequest } from "./actions";

const DEPOSIT_TO_BLOCK = 100;

function pad(value) {
  return String(value).padStart(2, "0");
}

function keyFromDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateFromKey(key, hour = "00:00") {
  return new Date(`${key}T${hour || "00:00"}:00`);
}

function formatDay(key) {
  if (!key) return "Non choisi";
  return new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatMoney(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("fr-FR")}€`;
}

function rentalDays(startDate, startHour, endDate, endHour) {
  if (!startDate || !endDate || !startHour || !endHour) return 0;
  const start = dateFromKey(startDate, startHour);
  const end = dateFromKey(endDate, endHour);
  const diff = end.getTime() - start.getTime();
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / 86400000));
}

function overlapsBooking(startDate, startHour, endDate, endHour, bookings) {
  if (!startDate || !endDate || !startHour || !endHour) return false;
  const start = dateFromKey(startDate, startHour);
  const end = dateFromKey(endDate, endHour);
  if (end <= start) return true;

  return (bookings || []).some((booking) => {
    if (booking.status === "Annulée" || booking.status === "Terminée") return false;
    const bookingStart = new Date(booking.start_date);
    const bookingEnd = new Date(booking.end_date);
    return bookingEnd > start && bookingStart < end;
  });
}

function bookingSegmentForDay(dayKey, bookings) {
  for (const booking of bookings || []) {
    if (booking.status === "Annulée" || booking.status === "Terminée") continue;
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    const startKey = keyFromDate(start);
    const endKey = keyFromDate(end);

    if (dayKey < startKey || dayKey > endKey) continue;
    if (startKey === endKey && dayKey === startKey) return "single";
    if (dayKey === startKey) return "start";
    if (dayKey === endKey) return "end";
    return "middle";
  }
  return null;
}

function monthDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstWeekDay = (first.getDay() + 6) % 7;
  const cells = [];

  for (let i = 0; i < firstWeekDay; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function BookingWizard({ agency, vehicle, slug, vehicleBookings = [], waLink }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selecting, setSelecting] = useState("start");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startHour, setStartHour] = useState("09:00");
  const [endHour, setEndHour] = useState("18:00");
  const [error, setError] = useState("");

  const [info, setInfo] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    license_number: "",
    address: "",
    message: "",
    payment_method: "stripe",
  });

  const days = rentalDays(startDate, startHour, endDate, endHour);
  const pricePerDay = Number(vehicle.price_per_day || 0);
  const totalAmount = days > 0 && pricePerDay > 0 ? days * pricePerDay : 0;
  const blocked = overlapsBooking(startDate, startHour, endDate, endHour, vehicleBookings);

  const monthLabel = useMemo(() => {
    return monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }, [monthDate]);

  function chooseDate(dayKey) {
    const segment = bookingSegmentForDay(dayKey, vehicleBookings);
    if (segment === "middle") {
      setError("Cette journée est déjà entièrement réservée.");
      return;
    }
    setError("");

    if (selecting === "start") {
      setStartDate(dayKey);
      if (endDate && dayKey > endDate) setEndDate("");
      setSelecting("end");
    } else {
      if (startDate && dayKey < startDate) {
        setStartDate(dayKey);
        setEndDate("");
        setSelecting("end");
      } else {
        setEndDate(dayKey);
      }
    }
  }

  function nextFromPlanning() {
    if (!startDate || !endDate || !startHour || !endHour) {
      setError("Choisis la date de départ, l’heure, la date de retour et l’heure.");
      return;
    }
    if (days <= 0) {
      setError("La date de retour doit être après la date de départ.");
      return;
    }
    if (blocked) {
      setError("Cette période croise déjà une réservation. Choisis une autre période.");
      return;
    }
    setError("");
    setStep(2);
  }

  function nextFromInfo() {
    if (!info.first_name || !info.phone || !info.email || !info.license_number || !info.address) {
      setError("Remplis prénom, email, téléphone, numéro de permis et adresse.");
      return;
    }
    setError("");
    setStep(3);
  }

  function nextFromDocs() {
    setError("");
    setStep(4);
  }

  if (!open) {
    return (
      <button className="reserveBtn" type="button" onClick={() => setOpen(true)}>
        Demander ce véhicule
      </button>
    );
  }

  return (
    <div className="wizardOverlay">
      <form action={submitPublicBookingRequest} className="wizardPage">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="agency_id" value={agency.id} />
        <input type="hidden" name="vehicle_id" value={vehicle.id} />
        <input type="hidden" name="start_date" value={startDate} />
        <input type="hidden" name="end_date" value={endDate} />
        <input type="hidden" name="start_hour" value={startHour} />
        <input type="hidden" name="end_hour" value={endHour} />
        <input type="hidden" name="total_amount" value={totalAmount} />
        <input type="hidden" name="deposit_amount" value={DEPOSIT_TO_BLOCK} />
        <input type="hidden" name="vehicle_deposit_amount" value={Number(vehicle.deposit_amount || 0)} />
        <input type="hidden" name="payment_method" value={info.payment_method} />
        <input type="hidden" name="message" value={info.message} />

        <div className="wizardHeader">
          <div>
            <span className="wizardStep">Étape {step}/5</span>
            <h2>{vehicle.name || `${vehicle.brand || ""} ${vehicle.model || ""}`}</h2>
            <p>Demande de réservation sécurisée</p>
          </div>
          <button className="closeBtn" type="button" onClick={() => setOpen(false)}>Fermer</button>
        </div>

        <div className="progressBar"><span style={{ width: `${step * 20}%` }} /></div>

        {error && <div className="wizardError">{error}</div>}

        {step === 1 && (
          <section className="wizardCard">
            <h3>Planning, date et heure</h3>
            <p className="mutedText">Les zones rouges indiquent les périodes déjà réservées. Les premiers et derniers jours sont affichés à moitié quand la voiture part ou revient ce jour-là.</p>

            <div className="selectorTabs">
              <button type="button" className={selecting === "start" ? "active" : ""} onClick={() => setSelecting("start")}>Départ : {formatDay(startDate)}</button>
              <button type="button" className={selecting === "end" ? "active" : ""} onClick={() => setSelecting("end")}>Retour : {formatDay(endDate)}</button>
            </div>

            <div className="timeRow">
              <label>Heure départ<input type="time" value={startHour} onChange={(e) => setStartHour(e.target.value)} /></label>
              <label>Heure retour<input type="time" value={endHour} onChange={(e) => setEndHour(e.target.value)} /></label>
            </div>

            <div className="calendarBox">
              <div className="calendarTop">
                <button type="button" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}>←</button>
                <strong>{monthLabel}</strong>
                <button type="button" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}>→</button>
              </div>

              <div className="weekHeader"><span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span></div>

              <div className="calendarGrid">
                {monthDays(monthDate).map((day, index) => {
                  if (!day) return <div className="calendarEmpty" key={`empty-${index}`} />;
                  const dayKey = keyFromDate(day);
                  const segment = bookingSegmentForDay(dayKey, vehicleBookings);
                  const isSelected = dayKey === startDate || dayKey === endDate;
                  const inRange = startDate && endDate && dayKey > startDate && dayKey < endDate;
                  const isPast = dateFromKey(dayKey) < dateFromKey(keyFromDate(new Date()));

                  return (
                    <button
                      type="button"
                      key={dayKey}
                      disabled={isPast || segment === "middle"}
                      onClick={() => chooseDate(dayKey)}
                      className={`calendarDay ${segment ? `book-${segment}` : ""} ${isSelected ? "selected" : ""} ${inRange ? "inRange" : ""}`}
                    >
                      <span>{day.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="priceSummary">
              <div><span>Durée</span><strong>{days || 0} jour(s)</strong></div>
              <div><span>Prix total</span><strong>{totalAmount ? formatMoney(totalAmount) : "À calculer"}</strong></div>
              <div><span>Caution</span><strong>{vehicle.deposit_amount ? formatMoney(vehicle.deposit_amount) : "À voir avec l’agence"}</strong></div>
            </div>

            <button className="reserveBtn full" type="button" onClick={nextFromPlanning}>Suivant</button>
          </section>
        )}

        {step === 2 && (
          <section className="wizardCard">
            <h3>Informations client</h3>
            <div className="formGrid">
              <input name="first_name" placeholder="Prénom *" value={info.first_name} onChange={(e) => setInfo({ ...info, first_name: e.target.value })} required />
              <input name="last_name" placeholder="Nom" value={info.last_name} onChange={(e) => setInfo({ ...info, last_name: e.target.value })} />
              <input name="email" type="email" placeholder="Email *" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} required />
              <input name="phone" placeholder="Numéro de téléphone *" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} required />
              <input name="license_number" placeholder="Numéro de permis *" value={info.license_number} onChange={(e) => setInfo({ ...info, license_number: e.target.value })} required />
              <input name="address" placeholder="Adresse complète *" value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} required />
            </div>
            <textarea value={info.message} onChange={(e) => setInfo({ ...info, message: e.target.value })} placeholder="Message complémentaire" rows="3" />
            <div className="wizardActions"><button type="button" className="ghostBtn" onClick={() => setStep(1)}>Retour</button><button type="button" className="reserveBtn" onClick={nextFromInfo}>Suivant</button></div>
          </section>
        )}

        {step === 3 && (
          <section className="wizardCard">
            <h3>Documents à importer</h3>
            <p className="mutedText">Ajoute les documents demandés pour accélérer la validation par l’agence.</p>
            <div className="fileGrid">
              <label>Permis recto<input name="license_front" type="file" accept="image/*,.pdf" /></label>
              <label>Permis verso<input name="license_back" type="file" accept="image/*,.pdf" /></label>
              <label>Carte identité recto<input name="id_front" type="file" accept="image/*,.pdf" /></label>
              <label>Carte identité verso<input name="id_back" type="file" accept="image/*,.pdf" /></label>
              <label>Justificatif domicile<input name="address_proof" type="file" accept="image/*,.pdf" /></label>
            </div>
            <div className="wizardActions"><button type="button" className="ghostBtn" onClick={() => setStep(2)}>Retour</button><button type="button" className="reserveBtn" onClick={nextFromDocs}>Suivant</button></div>
          </section>
        )}

        {step === 4 && (
          <section className="wizardCard">
            <h3>Récapitulatif</h3>
            <div className="recapGrid">
              <div><span>Véhicule</span><strong>{vehicle.name || vehicle.brand}</strong></div>
              <div><span>Client</span><strong>{info.first_name} {info.last_name}</strong></div>
              <div><span>Départ</span><strong>{formatDay(startDate)} à {startHour}</strong></div>
              <div><span>Retour</span><strong>{formatDay(endDate)} à {endHour}</strong></div>
              <div><span>Prix location</span><strong>{totalAmount ? formatMoney(totalAmount) : "À confirmer"}</strong></div>
              <div><span>Acompte obligatoire</span><strong>{formatMoney(DEPOSIT_TO_BLOCK)}</strong></div>
              <div><span>Caution</span><strong>{vehicle.deposit_amount ? formatMoney(vehicle.deposit_amount) : "À confirmer"}</strong></div>
            </div>
            <div className="wizardActions"><button type="button" className="ghostBtn" onClick={() => setStep(3)}>Retour</button><button type="button" className="reserveBtn" onClick={() => setStep(5)}>Passer au paiement</button></div>
          </section>
        )}

        {step === 5 && (
          <section className="wizardCard">
            <h3>Paiement de l’acompte</h3>
            <p className="mutedText">Acompte obligatoire de <strong>{formatMoney(DEPOSIT_TO_BLOCK)}</strong> pour bloquer le véhicule. Le paiement réel Stripe/PayPal doit être connecté avec les comptes de l’agence.</p>

            <div className="paymentChoices">
              <label className={info.payment_method === "stripe" ? "active" : ""}><input type="radio" checked={info.payment_method === "stripe"} onChange={() => setInfo({ ...info, payment_method: "stripe" })} /> Carte bancaire / Stripe</label>
              <label className={info.payment_method === "paypal" ? "active" : ""}><input type="radio" checked={info.payment_method === "paypal"} onChange={() => setInfo({ ...info, payment_method: "paypal" })} /> PayPal</label>
              <label className={info.payment_method === "virement" ? "active" : ""}><input type="radio" checked={info.payment_method === "virement"} onChange={() => setInfo({ ...info, payment_method: "virement" })} /> Virement / paiement pro</label>
            </div>

            <div className="paymentNotice">
              Le bouton ci-dessous envoie la demande avec le statut <strong>Acompte à vérifier</strong>. Ensuite on connectera Stripe/PayPal pour encaisser et rembourser automatiquement.
            </div>

            {waLink && <a className="whatsappSmall" href={waLink} target="_blank">Contacter l’agence si besoin</a>}

            <div className="wizardActions"><button type="button" className="ghostBtn" onClick={() => setStep(4)}>Retour</button><button type="submit" className="reserveBtn">Confirmer la demande</button></div>
          </section>
        )}
      </form>
    </div>
  );
}
