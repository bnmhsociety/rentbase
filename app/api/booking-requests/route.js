import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { eur, fmtDateTime, overlap, rentalDays, sanitizeFileName, toIso } from "../../../lib/helpers";
import { emailShell, sendEmail, summaryHtml } from "../../../lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function uploadFile(bucket, path, file) {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

async function assertAvailable({ agencyId, vehicleId, startISO, endISO }) {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id,start_date,end_date,status")
    .eq("agency_id", agencyId)
    .eq("vehicle_id", vehicleId);

  const activeBookings = (bookings || []).filter((b) => !["Terminée", "Annulée"].includes(String(b.status || "")));
  const bookingConflict = activeBookings.some((b) => overlap(startISO, endISO, b.start_date, b.end_date));
  if (bookingConflict) throw new Error("Ce véhicule est déjà réservé sur cette période.");

  const { data: requests } = await supabase
    .from("booking_requests")
    .select("id,start_date,end_date,start_hour,end_hour,status")
    .eq("agency_id", agencyId)
    .eq("vehicle_id", vehicleId);

  const activeStatuses = ["Acceptée", "Confirmée", "Finalisée", "Réservation confirmée"];
  const requestConflict = (requests || []).some((r) => {
    if (!activeStatuses.includes(String(r.status || ""))) return false;
    const rStart = toIso(r.start_date, r.start_hour || "09:00");
    const rEnd = toIso(r.end_date, r.end_hour || "18:00");
    return overlap(startISO, endISO, rStart, rEnd);
  });

  if (requestConflict) throw new Error("Ce véhicule est déjà bloqué sur cette période.");
}

async function sendReceivedEmail({ agency, vehicle, request }) {
  if (!request.email) return { skipped: true };

  const paymentLabel = request.payment_choice === "carte" ? "Carte bancaire / paiement en ligne" : "En agence / espèces";
  const content = `
    <div style="background:#0A49FF;color:white;border-radius:22px;padding:18px;font-size:25px;font-weight:900">Demande reçue</div>
    <p style="font-size:16px;font-weight:700">Bonjour ${request.first_name || ""},</p>
    <p>Votre demande a bien été transmise à <strong>${agency.website_name || agency.name}</strong>.</p>
    <p>L’agence va examiner votre demande. Si elle accepte, vous recevrez un email avec le montant total et l’acompte à régler.</p>
    ${summaryHtml([
      ["Agence", agency.website_name || agency.name],
      ["Véhicule", vehicle.name || "Véhicule"],
      ["Départ", fmtDateTime(request.start_date, request.start_hour)],
      ["Retour", fmtDateTime(request.end_date, request.end_hour)],
      ["Mode de paiement souhaité", paymentLabel],
      ["Prix 24h", eur(vehicle.price_per_day)],
      ["Caution", eur(vehicle.deposit_amount)],
    ])}
  `;

  return sendEmail({
    to: request.email,
    subject: `Demande reçue - ${agency.website_name || agency.name}`,
    html: emailShell(content),
  });
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const agencyId = String(form.get("agency_id") || "");
    const vehicleId = String(form.get("vehicle_id") || "");
    if (!agencyId || !vehicleId) throw new Error("Agence ou véhicule manquant.");

    const { data: agency, error: agencyError } = await supabase.from("agencies").select("*").eq("id", agencyId).limit(1);
    if (agencyError) throw agencyError;
    if (!agency?.[0]) throw new Error("Agence introuvable.");

    const { data: vehicleRows, error: vehicleError } = await supabase.from("vehicles").select("*").eq("id", vehicleId).eq("agency_id", agencyId).limit(1);
    if (vehicleError) throw vehicleError;
    const vehicle = vehicleRows?.[0];
    if (!vehicle) throw new Error("Véhicule introuvable.");

    const startDate = String(form.get("start_date") || "").slice(0, 10);
    const endDate = String(form.get("end_date") || "").slice(0, 10);
    const startHour = String(form.get("start_hour") || "09:00");
    const endHour = String(form.get("end_hour") || "18:00");
    const startISO = toIso(startDate, startHour);
    const endISO = toIso(endDate, endHour);
    const days = rentalDays(startISO, endISO);

    if (!startISO || !endISO || days <= 0) throw new Error("Dates invalides.");
    await assertAvailable({ agencyId, vehicleId, startISO, endISO });

    const firstName = String(form.get("first_name") || "").trim();
    const lastName = String(form.get("last_name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const address = String(form.get("address") || "").trim();
    const zipCode = String(form.get("zip_code") || "").trim();
    const city = String(form.get("city") || "").trim();
    const paymentChoice = String(form.get("payment_choice") || "").trim();

    if (!firstName || !lastName || !email || !phone || !address || !zipCode || !city || !paymentChoice) {
      throw new Error("Informations obligatoires manquantes.");
    }

    const safeBase = `${agencyId}/booking-requests/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const licenseFrontFile = form.get("license_front");
    const licenseBackFile = form.get("license_back");
    const idFrontFile = form.get("id_front");
    const idBackFile = form.get("id_back");
    const addressProofFile = form.get("address_proof");

    const licenseFront = await uploadFile("rentbase-documents", `${safeBase}/permis-recto-${sanitizeFileName(licenseFrontFile?.name)}`, licenseFrontFile);
    const licenseBack = await uploadFile("rentbase-documents", `${safeBase}/permis-verso-${sanitizeFileName(licenseBackFile?.name)}`, licenseBackFile);
    const idFront = await uploadFile("rentbase-documents", `${safeBase}/id-recto-${sanitizeFileName(idFrontFile?.name)}`, idFrontFile);
    const idBack = await uploadFile("rentbase-documents", `${safeBase}/id-verso-${sanitizeFileName(idBackFile?.name)}`, idBackFile);
    const addressProof = await uploadFile("rentbase-documents", `${safeBase}/justificatif-${sanitizeFileName(addressProofFile?.name)}`, addressProofFile);

    if (!licenseFront || !licenseBack || !idFront || !idBack || !addressProof) {
      throw new Error("Tous les documents sont obligatoires.");
    }

    const requestPayload = {
      agency_id: agencyId,
      vehicle_id: vehicleId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      address: `${address}\n${zipCode} ${city}`,
      start_date: startDate,
      end_date: endDate,
      start_hour: startHour,
      end_hour: endHour,
      status: "Nouvelle",
      payment_choice: paymentChoice,
      payment_method: paymentChoice,
      request_message: String(form.get("request_message") || ""),
      message: String(form.get("request_message") || ""),
      total_amount: Number(form.get("total_amount") || 0),
      deposit_amount: Number(form.get("deposit_amount") || vehicle.booking_deposit_amount || 0),
      vehicle_deposit_amount: Number(form.get("vehicle_deposit_amount") || vehicle.deposit_amount || 0),
      rental_days: days,
      payment_status: "Non demandé",
      client_confirmation_status: "Non confirmé",
      license_front_path: licenseFront,
      license_back_path: licenseBack,
      id_front_path: idFront,
      id_back_path: idBack,
      address_proof_path: addressProof,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("booking_requests")
      .insert(requestPayload)
      .select()
      .limit(1);

    if (insertError) throw insertError;
    const request = inserted?.[0];
    if (!request) throw new Error("Demande non créée.");

    const emailResult = await sendReceivedEmail({ agency: agency[0], vehicle, request });
    if (emailResult.sent) {
      await supabase.from("booking_requests").update({ received_email_sent_at: new Date().toISOString() }).eq("id", request.id);
    }

    return NextResponse.json({ success: true, id: request.id });
  } catch (error) {
    console.error("Erreur API booking-requests:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
