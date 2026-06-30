"use server";

import { redirect } from "next/navigation";
import { supabaseInsert, supabasePatch, supabaseUpload } from "../../lib/supabase";

function cleanText(value) {
  return String(value || "").trim();
}

function numberValue(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function fileExt(file) {
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  if (type.includes("png") || name.endsWith(".png")) return "png";
  if (type.includes("webp") || name.endsWith(".webp")) return "webp";
  if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  return "jpg";
}

async function uploadRequestFile({ agencyId, requestId, file, label }) {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) return null;
  const ext = fileExt(file);
  const safeLabel = label.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
  const storagePath = `${agencyId}/booking-requests/${requestId}/${safeLabel}-${Date.now()}.${ext}`;
  await supabaseUpload("rentbase-documents", storagePath, file, file.type || "application/octet-stream");
  return storagePath;
}

export async function submitPublicBookingRequest(formData) {
  const slug = cleanText(formData.get("slug"));
  const agencyId = cleanText(formData.get("agency_id"));
  const vehicleId = cleanText(formData.get("vehicle_id"));

  const firstName = cleanText(formData.get("first_name"));
  const lastName = cleanText(formData.get("last_name"));
  const phone = cleanText(formData.get("phone"));
  const email = cleanText(formData.get("email"));
  const licenseNumber = cleanText(formData.get("license_number"));
  const address = cleanText(formData.get("address"));

  const startDate = cleanText(formData.get("start_date"));
  const endDate = cleanText(formData.get("end_date"));
  const startHour = cleanText(formData.get("start_hour"));
  const endHour = cleanText(formData.get("end_hour"));

  const message = cleanText(formData.get("message"));
  const totalAmount = numberValue(formData.get("total_amount"));
  const depositAmount = numberValue(formData.get("deposit_amount")) || 100;
  const vehicleDepositAmount = numberValue(formData.get("vehicle_deposit_amount"));
  const paymentMethod = cleanText(formData.get("payment_method"));

  if (!slug || !agencyId || !vehicleId || !firstName || !phone || !startDate || !endDate || !startHour || !endHour || !paymentMethod) {
    redirect(`/${slug || ""}?demande=erreur`);
  }

  const rows = await supabaseInsert(
    "/rest/v1/booking_requests",
    {
      agency_id: agencyId,
      vehicle_id: vehicleId,
      first_name: firstName,
      last_name: lastName || null,
      phone,
      email: email || null,
      license_number: licenseNumber || null,
      address: address || null,
      start_date: startDate,
      end_date: endDate,
      start_hour: startHour,
      end_hour: endHour,
      message: message || null,
      total_amount: totalAmount,
      deposit_amount: depositAmount,
      vehicle_deposit_amount: vehicleDepositAmount,
      payment_method: paymentMethod,
      payment_status: "Acompte à vérifier",
      status: "Nouvelle",
    },
    { service: true }
  );

  const request = rows?.[0];
  if (!request?.id) redirect(`/${slug}?demande=erreur`);

  const licenseFront = await uploadRequestFile({ agencyId, requestId: request.id, file: formData.get("license_front"), label: "permis-recto" });
  const licenseBack = await uploadRequestFile({ agencyId, requestId: request.id, file: formData.get("license_back"), label: "permis-verso" });
  const idFront = await uploadRequestFile({ agencyId, requestId: request.id, file: formData.get("id_front"), label: "identite-recto" });
  const idBack = await uploadRequestFile({ agencyId, requestId: request.id, file: formData.get("id_back"), label: "identite-verso" });
  const addressProof = await uploadRequestFile({ agencyId, requestId: request.id, file: formData.get("address_proof"), label: "justificatif-domicile" });

  await supabasePatch(
    `/rest/v1/booking_requests?id=eq.${request.id}`,
    {
      license_front_path: licenseFront,
      license_back_path: licenseBack,
      id_front_path: idFront,
      id_back_path: idBack,
      address_proof_path: addressProof,
    },
    { service: true }
  );

  redirect(`/${slug}?demande=envoyee`);
}
