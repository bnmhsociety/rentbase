import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { rentalDays, toIso } from "../../../lib/helpers";

async function uploadFile(bucket, path, file) {
  if (!file || file.size === 0) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

async function sendReceivedEmail({ agency, vehicle, request }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from || !request.email) return { skipped: true };

  const html = `
  <div style="font-family:Arial,sans-serif;background:#f4f6fb;padding:24px;color:#0f172a">
    <div style="max-width:640px;margin:auto;background:white;border-radius:24px;padding:24px;border:1px solid #e8ecf4">
      <div style="background:#0A49FF;color:white;border-radius:20px;padding:18px;font-size:24px;font-weight:900">Demande reçue</div>
      <p style="font-size:16px;font-weight:700">Bonjour ${request.first_name || ""},</p>
      <p>Votre demande a bien été transmise à <strong>${agency.website_name || agency.name}</strong>. L’agence va examiner votre demande et vous recontactera très bientôt.</p>
      <div style="background:#f8fafc;border-radius:18px;padding:16px;margin-top:18px">
        <h3 style="margin-top:0">Récapitulatif</h3>
        <p><strong>Véhicule :</strong> ${vehicle.name || "Véhicule"}</p>
        <p><strong>Départ :</strong> ${request.start_date || "—"} ${request.start_hour || ""}</p>
        <p><strong>Retour :</strong> ${request.end_date || "—"} ${request.end_hour || ""}</p>
        <p><strong>Mode de paiement souhaité :</strong> ${request.payment_choice === "carte" ? "Carte bancaire" : "En agence / espèces"}</p>
      </div>
      <p style="font-size:13px;color:#7d8797;margin-top:18px">Ce message est envoyé automatiquement par RentBase.</p>
    </div>
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: request.email,
      subject: `Demande reçue - ${agency.website_name || agency.name}`,
      html,
    }),
  });

  if (!res.ok) return { error: await res.text() };
  return { sent: true };
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const agencyId = String(form.get("agency_id") || "");
    const vehicleId = String(form.get("vehicle_id") || "");
    if (!agencyId || !vehicleId) throw new Error("Agence ou véhicule manquant.");

    const { data: agency, error: agencyError } = await supabase.from("agencies").select("*").eq("id", agencyId).maybeSingle();
    if (agencyError) throw agencyError;
    if (!agency) throw new Error("Agence introuvable.");

    const { data: vehicle, error: vehicleError } = await supabase.from("vehicles").select("*").eq("id", vehicleId).maybeSingle();
    if (vehicleError) throw vehicleError;
    if (!vehicle) throw new Error("Véhicule introuvable.");

    const startDate = String(form.get("start_date") || "");
    const endDate = String(form.get("end_date") || "");
    const startHour = String(form.get("start_hour") || "09:00");
    const endHour = String(form.get("end_hour") || "18:00");
    const startISO = toIso(startDate, startHour);
    const endISO = toIso(endDate, endHour);
    const days = rentalDays(startISO, endISO);
    if (days <= 0) throw new Error("Dates invalides.");

    const safeBase = `${agencyId}/booking-requests/${Date.now()}`;
    const licenseFront = await uploadFile("rentbase-documents", `${safeBase}/permis-recto-${form.get("license_front")?.name || "file"}`, form.get("license_front"));
    const licenseBack = await uploadFile("rentbase-documents", `${safeBase}/permis-verso-${form.get("license_back")?.name || "file"}`, form.get("license_back"));
    const idFront = await uploadFile("rentbase-documents", `${safeBase}/id-recto-${form.get("id_front")?.name || "file"}`, form.get("id_front"));
    const idBack = await uploadFile("rentbase-documents", `${safeBase}/id-verso-${form.get("id_back")?.name || "file"}`, form.get("id_back"));
    const addressProof = await uploadFile("rentbase-documents", `${safeBase}/justificatif-${form.get("address_proof")?.name || "file"}`, form.get("address_proof"));

    const requestPayload = {
      agency_id: agencyId,
      vehicle_id: vehicleId,
      first_name: String(form.get("first_name") || ""),
      last_name: String(form.get("last_name") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      address: String(form.get("address") || ""),
      start_date: startISO,
      end_date: endISO,
      start_hour: startHour,
      end_hour: endHour,
      message: String(form.get("request_message") || ""),
      request_message: String(form.get("request_message") || ""),
      payment_choice: String(form.get("payment_choice") || "agence"),
      status: "Nouvelle",
      total_amount: Number(form.get("total_amount") || 0),
      rental_days: days,
      deposit_amount: Number(form.get("deposit_amount") || vehicle.booking_deposit_amount || 0),
      vehicle_deposit_amount: Number(form.get("vehicle_deposit_amount") || vehicle.deposit_amount || 0),
      license_front_path: licenseFront,
      license_back_path: licenseBack,
      id_front_path: idFront,
      id_back_path: idBack,
      address_proof_path: addressProof,
      payment_status: "Non demandé",
      client_confirmation_status: "Non confirmé",
    };

    const { data, error } = await supabase.from("booking_requests").insert(requestPayload).select("*").single();
    if (error) throw error;

    const emailResult = await sendReceivedEmail({ agency, vehicle, request: data });
    if (emailResult.sent) {
      await supabase.from("booking_requests").update({ received_email_sent_at: new Date().toISOString() }).eq("id", data.id);
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
