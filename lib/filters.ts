import { AREAS, CATEGORIES, COLLECTIONS } from "@/lib/data/spots";
import { isOpenAt } from "@/lib/hours";
import { haversineKm, type LatLng } from "@/lib/geo";
import type { AreaId, CategoryFilter, SortKey, Spot } from "@/lib/types";

export interface DiscoverFilters {
  area: AreaId | null;
  cat: CategoryFilter | null;
  collection: string | null;
  query: string;
  openNow: boolean;
  freeOnly: boolean;
  sort: SortKey;
}

export const DEFAULT_FILTERS: DiscoverFilters = {
  area: null,
  cat: null,
  collection: null,
  query: "",
  openNow: false,
  freeOnly: false,
  sort: "rec",
};

export function areaName(id: AreaId): string {
  return AREAS.find((a) => a.id === id)?.name ?? id;
}

export function categoryLabel(key: CategoryFilter): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/** Resolve a collection to its member spot ids; null collection → no restriction. */
export function collectionIds(collectionKey: string | null, spots: Spot[]): Set<string> | null {
  if (!collectionKey) return null;
  const col = COLLECTIONS.find((c) => c.key === collectionKey);
  if (!col) return null;
  const ids = col.spotIds ?? spots.filter((s) => s.priceBand === 0).map((s) => s.id);
  return new Set(ids);
}

export function matchesQuery(spot: Spot, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [spot.name, areaName(spot.area), spot.tags.join(" "), categoryLabel(spot.category)]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export interface FilterContext {
  /** Current time; null while unmounted/SSR, the openNow filter is then skipped. */
  now: Date | null;
  /** User location (from onboarding geolocation); enables distance + Nearest. */
  origin: LatLng | null;
}

/** All filters combine (AND). Category chip "free" means priceBand === 0. */
export function filterSpots(spots: Spot[], f: DiscoverFilters, ctx: FilterContext): Spot[] {
  const inCollection = collectionIds(f.collection, spots);
  return spots.filter((sp) => {
    if (inCollection && !inCollection.has(sp.id)) return false;
    if (f.cat === "free") {
      if (sp.priceBand !== 0) return false;
    } else if (f.cat && sp.category !== f.cat) return false;
    if (f.area && sp.area !== f.area) return false;
    if (f.freeOnly && sp.priceBand !== 0) return false;
    if (f.openNow && ctx.now && !isOpenAt(sp.hours, ctx.now)) return false;
    if (!matchesQuery(sp, f.query)) return false;
    return true;
  });
}

export function sortSpots(spots: Spot[], sort: SortKey, origin: LatLng | null): Spot[] {
  const list = [...spots];
  if (sort === "near" && origin) {
    list.sort((a, b) => distanceOf(a, origin) - distanceOf(b, origin));
  } else if (sort === "rating") {
    list.sort((a, b) => b.rating - a.rating);
  } else if (sort === "price") {
    list.sort((a, b) => a.priceBand - b.priceBand);
  }
  // "rec" (and "near" without a location) keeps the curated order.
  return list;
}

export function distanceOf(spot: Spot, origin: LatLng): number {
  return spot.coords ? haversineKm(origin, spot.coords) : Number.POSITIVE_INFINITY;
}

/** Chip counts respect area + search + collection but ignore the active category. */
export function categoryCounts(spots: Spot[], f: DiscoverFilters): Record<string, number> {
  const inCollection = collectionIds(f.collection, spots);
  const pre = spots.filter(
    (sp) =>
      (!f.area || sp.area === f.area) &&
      matchesQuery(sp, f.query) &&
      (!inCollection || inCollection.has(sp.id))
  );
  const counts: Record<string, number> = {};
  for (const c of CATEGORIES) {
    counts[c.key] =
      c.key === "free"
        ? pre.filter((x) => x.priceBand === 0).length
        : pre.filter((x) => x.category === c.key).length;
  }
  return counts;
}

export function listTitle(f: DiscoverFilters): string {
  if (f.collection) return COLLECTIONS.find((c) => c.key === f.collection)?.label ?? "Everything to do";
  if (f.area) return areaName(f.area);
  if (f.cat) return f.cat === "free" ? "Free things to do" : categoryLabel(f.cat);
  return "Everything to do";
}
