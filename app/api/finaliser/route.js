import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function POST(req) {
  try {
    const body = await req.json();
    const token = body.token;
    if (!token) throw new Error("Token manquant.");

    const { data: request, error } = await supabase
      .from("booking_requests")
      .select("id,acceptance_expires_at")
      .eq("acceptance_token", token)
      .maybeSingle();

    if (error) throw error;
    if (!request) throw new Error("Demande introuvable.");
    if (request.acceptance_expires_at && new Date(request.acceptance_expires_at) < new Date()) {
      throw new Error("Lien expiré.");
    }

    const { error: updateError } = await supabase
      .from("booking_requests")
      .update({
        client_confirmation_status: "Confirmé",
        payment_status: "À vérifier",
        client_confirmed_at: new Date().toISOString(),
        status: "Réservation confirmée",
      })
      .eq("id", request.id);

    if (updateError) throw updateError;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
