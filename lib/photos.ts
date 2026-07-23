import photosJson from "@/lib/data/photos.json";

/**
 * Google Places photo references bundled by `npm run places:photos`.
 * Server-side only by convention: the refs are looked up here and by the
 * /api/photo proxy; clients only ever see proxy URLs, never refs or the key.
 */
export interface SpotPhotoRef {
  ref: string;
  attr: string;
}

export const PHOTO_REFS = photosJson as Record<string, SpotPhotoRef[]>;

/** Proxy URLs for a spot's photos ([] when none). */
export function photoUrlsFor(spotId: string): string[] {
  return (PHOTO_REFS[spotId] ?? []).map((_, i) => `/api/photo/${spotId}/${i}`);
}

/** Photographer attributions for a spot's photos (Google policy: display them). */
export function photoAttrsFor(spotId: string): string[] {
  return (PHOTO_REFS[spotId] ?? []).map((p) => p.attr).filter(Boolean);
}
