import { createClient } from "@supabase/supabase-js";
import { cleanStoragePath } from "./helpers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL manquant dans Vercel.");
}

if (!publicKey && !serviceKey) {
  throw new Error("Clé Supabase manquante dans Vercel.");
}

export const supabase = createClient(supabaseUrl, serviceKey || publicKey, {
  auth: { persistSession: false },
});

export async function signedUrl(bucket, path, expiresIn = 3600) {
  if (!path) return null;
  const cleanPath = cleanStoragePath(bucket, path);
  if (!cleanPath) return null;
  if (cleanPath.startsWith("http")) return cleanPath;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(cleanPath, expiresIn);
  if (error) {
    console.error("Erreur signedUrl", bucket, cleanPath, error.message);
    return null;
  }
  return data?.signedUrl || null;
}
