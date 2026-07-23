import type { NextRequest } from "next/server";
import { PHOTO_REFS } from "@/lib/photos";

/**
 * Cached proxy for Google Places photos (SPEC §7 real images). The photo
 * refs live in lib/data/photos.json; the API key stays server-side. Images
 * are cached hard at the CDN so Google is hit roughly once per photo per
 * size per cache period, keeping the Photos SKU bill flat.
 */

/** Only the sizes the UI uses; anything else would be an abuse vector. */
const WIDTHS = new Set([200, 400, 800]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; idx: string }> }
) {
  const { id, idx } = await params;
  const photo = PHOTO_REFS[id]?.[Number(idx)];
  if (!photo) return new Response(null, { status: 404 });

  const key = process.env.PLACES_API_KEY;
  if (!key) return new Response(null, { status: 503 });

  const wParam = Number(request.nextUrl.searchParams.get("w"));
  const width = WIDTHS.has(wParam) ? wParam : 800;

  const upstream = await fetch(
    `https://places.googleapis.com/v1/${photo.ref}/media?maxWidthPx=${width}&key=${key}`,
    { redirect: "follow" }
  );
  if (!upstream.ok || !upstream.body) return new Response(null, { status: 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      // Google policy caps caching at 30 days; 7 days keeps photos fresh-ish
      // while still amortising nearly all traffic at the CDN.
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
