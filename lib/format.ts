import type { PriceBand } from "@/lib/types";

export function bandSymbol(band: PriceBand): string {
  return band === 0 ? "Free" : "R".repeat(band);
}

export function bandWord(band: PriceBand): string {
  return band === 0 ? "No cost" : band === 1 ? "Budget" : band === 2 ? "Mid-range" : "Splurge";
}

/** 1840 → "1.8k" */
export function formatReviewCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return initials || "Y";
}

/** Placeholder outbound links until real website/booking URLs exist (SPEC §7). */
export function fallbackSearchUrl(spotName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${spotName} Cape Town`)}`;
}

export function fallbackBookingUrl(spotName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`book ${spotName} Cape Town`)}`;
}

export function directionsUrl(spotName: string, placeId?: string | null): string {
  if (placeId) {
    // Deep-link the exact venue via its place_id, not a name search.
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      spotName
    )}&query_place_id=${placeId}`;
  }
  return `https://www.google.com/maps/search/${encodeURIComponent(`${spotName} Cape Town`)}`;
}
