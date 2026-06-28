const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServerKey() {
  return SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
}

export async function supabaseFetch(path, { service = false } = {}) {
  const key = service ? getServerKey() : SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !key) {
    throw new Error("Variables Supabase manquantes dans .env.local ou Vercel.");
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || data?.msg || text || "Erreur Supabase"
    );
  }

  return data;
}

export async function signedPhotoUrl(path) {
  if (!path) return null;

  const key = getServerKey();

  if (!SUPABASE_URL || !key) return null;

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/rentbase-photos/${path}`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 3600 }),
      cache: "no-store",
    }
  );

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) return null;

  const signedUrl = data?.signedURL || data?.signedUrl || data?.url;
  if (!signedUrl) return null;

  return signedUrl.startsWith("http")
    ? signedUrl
    : `${SUPABASE_URL}/storage/v1${signedUrl}`;
}
