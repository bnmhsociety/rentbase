export function eur(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€`;
}

export function fmtDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fmtDateTime(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dayKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toIso(date, hour = "09:00") {
  if (!date) return null;
  const safeHour = hour || "09:00";
  return new Date(`${date}T${safeHour}:00`).toISOString();
}

export function rentalDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function overlap(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return false;
  return new Date(endA) > new Date(startB) && new Date(startA) < new Date(endB);
}

export function normalizePhone(phone) {
  const raw = String(phone || "");
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `33${digits.slice(1)}`;
  return digits;
}

export function timeAgo(date) {
  if (!date) return "—";
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return "à l’instant";
  const min = Math.floor(seconds / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}
