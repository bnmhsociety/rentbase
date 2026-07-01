import { supabase, signedUrl } from "./supabase";
import { toIso } from "./helpers";

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
}

export async function getAgencyBySlug(slug) {
  const cleanSlug = decodeURIComponent(String(slug || "")).trim().toLowerCase();
  if (!cleanSlug) return null;

  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .or(`website_slug.ilike.${cleanSlug},website_url.ilike.%/${cleanSlug}%`)
    .limit(1);

  if (error) {
    console.error("Erreur getAgencyBySlug:", error.message);
    return null;
  }

  const row = data?.[0];
  if (!row) return null;

  const profilePhotoUrl = row.website_profile_photo_path
    ? await signedUrl("rentbase-photos", row.website_profile_photo_path, 3600)
    : null;

  return { ...row, profilePhotoUrl };
}

export async function getVehiclesForAgency(agencyId) {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur getVehiclesForAgency:", error.message);
    return [];
  }

  return Promise.all((data || []).map(hydrateVehicle));
}

export async function getVehicle(agencyId, vehicleId) {
  if (!isValidUuid(agencyId) || !isValidUuid(vehicleId)) {
    console.error("getVehicle UUID invalide:", { agencyId, vehicleId });
    return null;
  }

  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("id", vehicleId)
    .limit(1);

  if (error) {
    console.error("Erreur getVehicle:", error.message);
    return null;
  }

  const row = data?.[0];
  if (!row) return null;
  return hydrateVehicle(row);
}

async function hydrateVehicle(vehicle) {
  const path = vehicle.main_photo_path || vehicle.photo_url;
  const imageUrl = path ? await signedUrl("rentbase-photos", path, 3600) : null;
  return { ...vehicle, imageUrl };
}

export async function getVehicleBlocks(agencyId, vehicleId) {
  const blocks = [];

  if (!isValidUuid(agencyId) || !isValidUuid(vehicleId)) {
    console.error("getVehicleBlocks UUID invalide:", { agencyId, vehicleId });
    return blocks;
  }

  try {
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id,start_date,end_date,status")
      .eq("agency_id", agencyId)
      .eq("vehicle_id", vehicleId);

    if (!error) {
      blocks.push(...(bookings || [])
        .filter((b) => !["Terminée", "Annulée"].includes(String(b.status || "")))
        .map((b) => ({ ...b, source: "booking" })));
    } else {
      console.error("Erreur blocks bookings:", error.message);
    }
  } catch (err) {
    console.error("Erreur blocks bookings catch:", err.message);
  }

  try {
    const { data: requests, error } = await supabase
      .from("booking_requests")
      .select("id,start_date,end_date,start_hour,end_hour,status")
      .eq("agency_id", agencyId)
      .eq("vehicle_id", vehicleId);

    if (!error) {
      const activeStatuses = ["Acceptée", "Confirmée", "Finalisée", "Réservation confirmée"];
      blocks.push(...(requests || [])
        .filter((r) => activeStatuses.includes(String(r.status || "")))
        .map((r) => ({
          ...r,
          source: "request",
          start_date: toIso(r.start_date, r.start_hour || "09:00") || r.start_date,
          end_date: toIso(r.end_date, r.end_hour || "18:00") || r.end_date,
        })));
    } else {
      console.error("Erreur blocks requests:", error.message);
    }
  } catch (err) {
    console.error("Erreur blocks requests catch:", err.message);
  }

  return blocks.filter((item) => item.start_date && item.end_date);
}

export async function getRequestById(requestId) {
  if (!isValidUuid(requestId)) return null;

  const { data, error } = await supabase
    .from("booking_requests")
    .select("*,agencies(*),vehicles(*)")
    .eq("id", requestId)
    .limit(1);

  if (error) {
    console.error("Erreur getRequestById:", error.message);
    return null;
  }
  return data?.[0] || null;
}

export async function getRequestByToken(token) {
  const { data, error } = await supabase
    .from("booking_requests")
    .select("*,agencies(*),vehicles(*)")
    .eq("acceptance_token", token)
    .limit(1);

  if (error) {
    console.error("Erreur getRequestByToken:", error.message);
    return null;
  }
  return data?.[0] || null;
}
