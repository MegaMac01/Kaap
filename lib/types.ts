export const CATEGORY_KEYS = [
  "eat",
  "bars",
  "outdoor",
  "classes",
  "chill",
  "arts",
  "family",
] as const;
export type Category = (typeof CATEGORY_KEYS)[number];

/** "free" is a pseudo-category (priceBand === 0), selectable as a chip. */
export type CategoryFilter = Category | "free";

export const AREA_IDS = [
  "waterfront",
  "bokaap",
  "citybowl",
  "seapoint",
  "campsbay",
  "tablemtn",
  "woodstock",
  "obs",
  "south",
  "constantia",
  "houtbay",
  "muizenberg",
  "blouberg",
  "durbanville",
  // Western Cape regions beyond the metro (day-trip and weekend territory).
  "winelands",
  "overberg",
  "westcoast",
  "gardenroute",
] as const;
export type AreaId = (typeof AREA_IDS)[number];

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** Times are "HH:MM" in SAST. close "24:00" means end of day (24h venues use 00:00–24:00). */
export interface HoursInterval {
  open: string;
  close: string;
}

/** Empty array = closed that day. */
export type WeeklyHours = Record<DayKey, HoursInterval[]>;

export type PriceBand = 0 | 1 | 2 | 3;

export interface Spot {
  id: string;
  name: string;
  category: Category;
  area: AreaId;
  /** Approximate venue coordinates; used for distance + "Nearest" sort. */
  coords: { lat: number; lng: number } | null;
  priceBand: PriceBand;
  priceEstimate: string;
  blurb: string;
  tags: string[];
  hours: WeeklyHours;
  address: string | null;
  phone: string | null;
  website: string | null;
  bookingUrl: string | null;
  /** TODO: real hosted photos (SPEC §7). Empty = striped category placeholder. */
  photos: string[];
  rating: number;
  reviewCount: number;
  updatedAt: string;
  /** Set when facts (hours, rating, contact) come from Google Places (SPEC §7). */
  googlePlaceId: string | null;
  /** True for spots auto-imported via a Places discovery sweep, not yet hand-curated. */
  isDiscovered?: boolean;
}

export interface Area {
  id: AreaId;
  name: string;
  /** Hide the text label on the browse map (marker only). */
  hideLabel?: boolean;
}

export interface Collection {
  key: string;
  label: string;
  desc: string;
  /** Lucide icon name key, mapped in the CollectionsRail component. */
  icon: string;
  /** Explicit members. null = rule-based (see `tag`, else all free spots). */
  spotIds: string[] | null;
  /** Rule-based membership: every spot carrying this tag. Overrides the
   *  free-spots default when set and spotIds is null. */
  tag?: string;
  /** Category palette used for the icon tile. */
  paletteKey: string;
}

export interface Interest {
  key: string;
  label: string;
}

/**
 * An adventure activity surfaced as a Discover chip ("Quad biking",
 * "Paragliding"). Spots belong to an activity via `tag` in Spot.tags;
 * the discovery sweep (scripts/discover-places.ts activity <key>) stamps
 * that tag onto every imported venue.
 */
export interface Activity {
  key: string;
  label: string;
  /** Tag that marks a spot as offering this activity. */
  tag: string;
  /** Kept for sweeps/tagging but not shown as its own chip (e.g. the camping
   *  umbrella tag, split into subtype chips). */
  hidden?: boolean;
}

export type SortKey = "rec" | "near" | "rating" | "price";

/**
 * A Google review bundled into lib/data/reviews.json by `npm run
 * places:reviews`, shown on spot pages with attribution. Google caching
 * policy applies, so re-run the fetch (and redeploy) at least monthly.
 */
export interface SpotReview {
  author: string;
  rating: number;
  /** Relative wording from Google, e.g. "2 weeks ago". */
  when: string;
  text: string;
}

export interface Profile {
  name: string;
  interests: string[];
  located: boolean;
  coords: { lat: number; lng: number } | null;
}
