import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { cleanStoragePath } from "../../../lib/helpers";

const ALLOWED_BUCKETS = new Set(["rentbase-photos"]);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket") || "";
    const rawPath = searchParams.get("path") || "";

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return new NextResponse("Bucket interdit", { status: 403 });
    }

    const path = cleanStoragePath(bucket, decodeURIComponent(rawPath));

    if (!path || path.startsWith("http")) {
      return new NextResponse("Chemin image invalide", { status: 400 });
    }

    const { data, error } = await supabase.storage.from(bucket).download(path);

    if (error || !data) {
      console.error("Erreur media download:", bucket, path, error?.message);
      return new NextResponse("Image introuvable", { status: 404 });
    }

    const arrayBuffer = await data.arrayBuffer();
    const contentType = data.type || "image/jpeg";

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Erreur api media:", error.message);
    return new NextResponse("Erreur image", { status: 500 });
  }
}
