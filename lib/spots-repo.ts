import { SPOTS } from "@/lib/data/spots";
import { photoUrlsFor } from "@/lib/photos";
import { getSupabase } from "@/lib/supabase/client";
import type { AreaId, Category, PriceBand, Spot, WeeklyHours } from "@/lib/types";

/**
 * Spot repository. Reads from Supabase when configured; otherwise serves the
 * bundled curated seed (same data the migration seeds into Postgres).
 */

interface SpotRow {
  id: string;
  name: string;
  category: Category;
  area: AreaId;
  lat: number | null;
  lng: number | null;
  price_band: number;
  price_estimate: string;
  blurb: string;
  tags: string[];
  hours: WeeklyHours;
  address: string | null;
  phone: string | null;
  website: string | null;
  booking_url: string | null;
  photos: string[];
  rating: number | null;
  review_count: number | null;
  updated_at: string;
  google_place_id: string | null;
}

function rowToSpot(r: SpotRow): Spot {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    area: r.area,
    coords: r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null,
    priceBand: r.price_band as PriceBand,
    priceEstimate: r.price_estimate,
    blurb: r.blurb,
    tags: r.tags ?? [],
    hours: r.hours,
    address: r.address,
    phone: r.phone,
    website: r.website,
    bookingUrl: r.booking_url,
    // Photos come from the bundled refs + /api/photo proxy, not the DB.
    photos: photoUrlsFor(r.id),
    rating: r.rating ?? 0,
    reviewCount: r.review_count ?? 0,
    updatedAt: r.updated_at,
    googlePlaceId: r.google_place_id ?? null,
  };
}

const withPhotos = (spots: Spot[]): Spot[] =>
  spots.map((s) => ({ ...s, photos: photoUrlsFor(s.id) }));

export async function getSpots(): Promise<Spot[]> {
  const sb = getSupabase();
  if (!sb) return withPhotos(SPOTS);
  const { data, error } = await sb
    .from("spots")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error || !data?.length) {
    console.warn("[kaap] Supabase spots fetch failed or empty, using seed data.", error?.message);
    return withPhotos(SPOTS);
  }
  return (data as SpotRow[]).map(rowToSpot);
}

export async function getSpot(id: string): Promise<Spot | null> {
  const spots = await getSpots();
  return spots.find((s) => s.id === id) ?? null;
}
