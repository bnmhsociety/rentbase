import { supabase, signedUrl } from "./supabase";

export async function getAgencyBySlug(slug) {
  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("website_slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  let profilePhotoUrl = null;
  if (data.website_profile_photo_path) {
    profilePhotoUrl = await signedUrl("rentbase-photos", data.website_profile_photo_path, 3600);
  }

  return { ...data, profilePhotoUrl };
}

export async function getVehiclesForAgency(agencyId) {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = await Promise.all(
    (data || []).map(async (vehicle) => {
      const path = vehicle.main_photo_path || vehicle.photo_url;
      const imageUrl = path ? await signedUrl("rentbase-photos", path, 3600) : null;
      return { ...vehicle, imageUrl };
    })
  );

  return rows;
}

export async function getVehicle(agencyId, vehicleId) {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("id", vehicleId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const path = data.main_photo_path || data.photo_url;
  const imageUrl = path ? await signedUrl("rentbase-photos", path, 3600) : null;
  return { ...data, imageUrl };
}

export async function getVehicleBlocks(agencyId, vehicleId) {
  const { data: bookings, error: bookingError } = await supabase
    .from("bookings")
    .select("id,start_date,end_date,status")
    .eq("agency_id", agencyId)
    .eq("vehicle_id", vehicleId)
    .not("status", "in", "(Terminée,Annulée)");

  if (bookingError) throw bookingError;

  const { data: requests, error: requestError } = await supabase
    .from("booking_requests")
    .select("id,start_date,end_date,status")
    .eq("agency_id", agencyId)
    .eq("vehicle_id", vehicleId)
    .in("status", ["Acceptée", "Confirmée", "Finalisée", "Réservation confirmée"]);

  if (requestError) throw requestError;

  return [
    ...(bookings || []).map((b) => ({ ...b, source: "booking" })),
    ...(requests || []).map((r) => ({ ...r, source: "request" })),
  ].filter((item) => item.start_date && item.end_date);
}

export async function getRequestById(requestId) {
  const { data, error } = await supabase
    .from("booking_requests")
    .select("*,agencies(*),vehicles(*)")
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function getRequestByToken(token) {
  const { data, error } = await supabase
    .from("booking_requests")
    .select("*,agencies(*),vehicles(*)")
    .eq("acceptance_token", token)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}
