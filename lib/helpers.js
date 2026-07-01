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

function dateTimeToDate(date, hour = "09:00") {
  const value = String(date || "").slice(0, 10);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [h, m] = normalizeHour(hour).split(":").map(Number);
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), h, m, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function eur(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€`;
}

export function safeText(value, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

export function fmtDate(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDateTime(date, hour = "") {
  if (!date) return "—";
  const d = hour ? dateTimeToDate(date, hour) : new Date(date);
  if (!d || Number.isNaN(d.getTime())) return `${date || ""} ${hour || ""}`.trim() || "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dayKey(date) {
  if (!date) return "";
  if (typeof date === "string") {
    const value = date.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date).slice(0, 10);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function toIso(date, hour = "09:00") {
  const d = dateTimeToDate(date, hour);
  if (!d) return null;
  return d.toISOString();
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
  if (digits.startsWith("00")) digits = digits.slice(2);
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

export function cleanStoragePath(bucket, path) {
  if (!path) return "";
  let value = String(path).trim();
  if (value.startsWith("http")) {
    const publicMarker = `/storage/v1/object/public/${bucket}/`;
    const signMarker = `/storage/v1/object/sign/${bucket}/`;
    if (value.includes(publicMarker)) value = value.split(publicMarker)[1];
    else if (value.includes(signMarker)) value = value.split(signMarker)[1];
    else return value;
  }
  value = value.split("?")[0].replace(/^\/+/, "");
  if (value.startsWith(`${bucket}/`)) value = value.slice(bucket.length + 1);
  return value;
}

export function sanitizeFileName(name = "file") {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90) || "file";
}
