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

export function publicStorageUrl(bucket, path) {
  if (!path) return null;
  const cleanPath = cleanStoragePath(bucket, path);
  if (!cleanPath) return null;
  if (cleanPath.startsWith("http")) return cleanPath;

  const encodedPath = cleanPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export function mediaProxyUrl(bucket, path) {
  if (!path) return null;
  const cleanPath = cleanStoragePath(bucket, path);
  if (!cleanPath) return null;
  if (cleanPath.startsWith("http")) return cleanPath;
  return `/api/media?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(cleanPath)}`;
}

export async function signedUrl(bucket, path, expiresIn = 3600) {
  if (!path) return null;

  const cleanPath = cleanStoragePath(bucket, path);
  if (!cleanPath) return null;
  if (cleanPath.startsWith("http")) return cleanPath;

  const attempts = Array.from(new Set([
    cleanPath,
    decodeURIComponent(cleanPath),
  ]));

  for (const attemptPath of attempts) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(attemptPath, expiresIn);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }

      if (error) {
        console.error("Erreur signedUrl", bucket, attemptPath, error.message);
      }
    } catch (error) {
      console.error("Erreur signedUrl catch", bucket, attemptPath, error.message);
    }
  }

  return publicStorageUrl(bucket, cleanPath);
}
