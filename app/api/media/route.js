export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { supabase, publicStorageUrl } from "../../../lib/supabase";
import { cleanStoragePath } from "../../../lib/helpers";

const ALLOWED_BUCKETS = new Set(["rentbase-photos"]);

function noStoreHeaders(contentType = "image/jpeg") {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket") || "";
    const rawPath = searchParams.get("path") || "";

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return new NextResponse("Bucket interdit", { status: 403, headers: noStoreHeaders("text/plain") });
    }

    const path = cleanStoragePath(bucket, decodeURIComponent(rawPath));

    if (!path || path.startsWith("http")) {
      return new NextResponse("Chemin image invalide", { status: 400, headers: noStoreHeaders("text/plain") });
    }

    // 1) Essai serveur direct. Fonctionne avec une clé secret/service role ou une policy storage SELECT.
    const { data, error } = await supabase.storage.from(bucket).download(path);

    if (!error && data) {
      const arrayBuffer = await data.arrayBuffer();
      const contentType = data.type || "image/jpeg";

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: noStoreHeaders(contentType),
      });
    }

    if (error) {
      console.error("Erreur media download:", bucket, path, error.message);
    }

    // 2) Fallback lien signé Supabase.
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 604800);

    if (!signedError && signedData?.signedUrl) {
      const imageResponse = await fetch(signedData.signedUrl, { cache: "no-store" });

      if (imageResponse.ok) {
        const arrayBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

        return new NextResponse(arrayBuffer, {
          status: 200,
          headers: noStoreHeaders(contentType),
        });
      }

      console.error("Erreur fetch signed image:", imageResponse.status, imageResponse.statusText);
    }

    if (signedError) {
      console.error("Erreur media signedUrl:", bucket, path, signedError.message);
    }

    // 3) Dernier fallback si le bucket est public.
    const publicUrl = publicStorageUrl(bucket, path);
    if (publicUrl) {
      const publicResponse = await fetch(publicUrl, { cache: "no-store" });
      if (publicResponse.ok) {
        const arrayBuffer = await publicResponse.arrayBuffer();
        const contentType = publicResponse.headers.get("content-type") || "image/jpeg";
        return new NextResponse(arrayBuffer, {
          status: 200,
          headers: noStoreHeaders(contentType),
        });
      }
    }

    return new NextResponse("Image introuvable", { status: 404, headers: noStoreHeaders("text/plain") });
  } catch (error) {
    console.error("Erreur api media:", error.message);
    return new NextResponse("Erreur image", { status: 500, headers: noStoreHeaders("text/plain") });
  }
}
