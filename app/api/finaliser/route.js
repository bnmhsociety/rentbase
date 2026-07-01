export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { emailShell, sendEmail, summaryHtml } from "../../../lib/mail";
import { eur, fmtDateTime } from "../../../lib/helpers";

export const runtime = "nodejs";

async function sendConfirmationEmail(request) {
  if (!request.email) return { skipped: true };
  const agency = request.agencies;
  const vehicle = request.vehicles;

  const content = `
    <div style="background:#12B76A;color:white;border-radius:22px;padding:18px;font-size:25px;font-weight:900">Réservation confirmée</div>
    <p style="font-size:16px;font-weight:700">Bonjour ${request.first_name || ""},</p>
    <p>Votre réservation pour <strong>${vehicle?.name || "le véhicule"}</strong> a bien été confirmée. L’agence vous contactera pour finaliser les derniers détails.</p>
    ${summaryHtml([
      ["Agence", agency?.website_name || agency?.name],
      ["Véhicule", vehicle?.name || "Véhicule"],
      ["Départ", fmtDateTime(request.start_date, request.start_hour)],
      ["Retour", fmtDateTime(request.end_date, request.end_hour)],
      ["Total location", eur(request.agency_total_amount)],
      ["Acompte", eur(request.agency_deposit_amount)],
      ["Reste jour J", eur(request.agency_remaining_amount)],
      ["Caution jour J", eur(request.vehicle_deposit_amount || vehicle?.deposit_amount)],
    ])}
  `;

  return sendEmail({
    to: request.email,
    subject: `Réservation confirmée - ${agency?.website_name || agency?.name}`,
    html: emailShell(content),
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const token = body.token;
    if (!token) throw new Error("Token manquant.");

    const { data: rows, error } = await supabase
      .from("booking_requests")
      .select("*,agencies(*),vehicles(*)")
      .eq("acceptance_token", token)
      .limit(1);

    if (error) throw error;
    const request = rows?.[0];
    if (!request) throw new Error("Demande introuvable.");

    if (request.acceptance_expires_at && new Date(request.acceptance_expires_at) < new Date()) {
      throw new Error("Lien expiré.");
    }

    const { error: updateError } = await supabase
      .from("booking_requests")
      .update({
        client_confirmation_status: "Confirmé",
        payment_status: "Paiement à vérifier",
        client_confirmed_at: new Date().toISOString(),
        status: "Réservation confirmée",
      })
      .eq("id", request.id);

    if (updateError) throw updateError;

    await sendConfirmationEmail(request);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur API finaliser:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
