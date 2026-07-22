/**
 * Bulk venue discovery via Google Places Nearby Search (SPEC §9 "provider
 * enrichment", scaled up): tile an area with search circles across activity-
 * relevant venue types, dedupe, auto-categorise, and stage the results.
 *
 *   npm run places:discover <area>          : sweep, write candidates JSON,
 *                                             print a category summary
 *   npm run places:discover <area> import   : merge candidates into
 *                                             lib/data/discovered.json and
 *                                             places-match.json (then run
 *                                             places:refresh + seed:sql)
 *
 * Discovered spots ride the same enrichment pipeline as curated ones; their
 * blurbs come from Google's editorial summary (or a plain type/suburb line)
 * until someone writes a proper one, so curate over time.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AreaId, Category, PriceBand } from "../lib/types";
import { haversineKm } from "../lib/geo";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MATCH_FILE = join(ROOT, "lib", "data", "places-match.json");
const DISCOVERED_FILE = join(ROOT, "lib", "data", "discovered.json");
const candidatesFile = (area: string) =>
  join(ROOT, "lib", "data", "candidates", `${area}.json`);

function loadEnvLocal() {
  const file = join(ROOT, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}
loadEnvLocal();

const KEY = process.env.PLACES_API_KEY;
if (!KEY) {
  console.error("PLACES_API_KEY is not set (add it to .env.local).");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Circle {
  lat: number;
  lng: number;
  radius: number;
}

/** Search tiles per area. Overlapping circles beat one big one: Nearby
 *  Search returns max 20 places per call, so density needs tiling. */
const AREA_TILES: Partial<Record<AreaId, Circle[]>> = {
  blouberg: [
    { lat: -33.7255, lng: 18.4405, radius: 2200 }, // Melkbosstrand
    { lat: -33.7935, lng: 18.4568, radius: 1500 }, // Big Bay / Eden on the Bay
    { lat: -33.808, lng: 18.4635, radius: 1200 }, // Bloubergstrand village
    { lat: -33.8218, lng: 18.4805, radius: 1500 }, // Table View beachfront
    { lat: -33.828, lng: 18.4965, radius: 1600 }, // Table View inland
    { lat: -33.8065, lng: 18.489, radius: 1700 }, // Parklands
    { lat: -33.853, lng: 18.4915, radius: 1500 }, // Sunset Beach
  ],
};

/** Google place types → our categories. Order = priority when a venue
 *  matches several groups (family beats arts beats bars beats eat...). */
const TYPE_GROUPS: { category: Category; types: string[] }[] = [
  {
    category: "family",
    types: [
      "amusement_park",
      "amusement_center",
      "water_park",
      "zoo",
      "aquarium",
      "playground",
      "bowling_alley",
      "movie_theater",
      "ice_cream_shop",
    ],
  },
  {
    category: "arts",
    types: ["art_gallery", "museum", "cultural_center", "performing_arts_theater"],
  },
  {
    category: "outdoor",
    types: ["beach", "park", "hiking_area", "national_park", "marina"],
  },
  {
    category: "chill",
    types: ["garden", "botanical_garden", "picnic_ground", "plaza", "spa", "observation_deck"],
  },
  {
    category: "classes",
    types: ["sports_activity_location", "sports_club", "gym", "yoga_studio"],
  },
  {
    category: "bars",
    types: ["bar", "pub", "night_club", "wine_bar"],
  },
  {
    category: "eat",
    types: ["restaurant", "cafe", "coffee_shop", "bakery"],
  },
];

interface GoogleNearbyPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
  primaryTypeDisplayName?: { text: string };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  businessStatus?: string;
  editorialSummary?: { text: string };
}

export interface Candidate {
  placeId: string;
  name: string;
  category: Category;
  coords: { lat: number; lng: number } | null;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  priceLevel: string | null;
  summary: string | null;
  primaryType: string | null;
  types: string[];
}

async function searchNearby(types: string[], circle: Circle): Promise<GoogleNearbyPlace[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.types",
        "places.primaryTypeDisplayName",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.businessStatus",
        "places.editorialSummary",
      ].join(","),
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 20,
      rankPreference: "POPULARITY",
      locationRestriction: {
        circle: {
          center: { latitude: circle.lat, longitude: circle.lng },
          radius: circle.radius,
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`searchNearby ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { places?: GoogleNearbyPlace[] };
  return data.places ?? [];
}

async function runDiscover(area: AreaId) {
  const tiles = AREA_TILES[area];
  if (!tiles) {
    console.error(`No search tiles configured for area "${area}", add them to AREA_TILES.`);
    process.exit(1);
  }

  const found = new Map<string, Candidate>();
  let calls = 0;
  for (const group of TYPE_GROUPS) {
    for (const tile of tiles) {
      let places: GoogleNearbyPlace[];
      try {
        places = await searchNearby(group.types, tile);
        calls++;
      } catch (err) {
        // One bad/renamed type (Google's type list shifts) shouldn't sink the
        // whole sweep: log it and keep going with the rest.
        console.warn(`  ! ${group.category} @ ${tile.lat},${tile.lng}: ${(err as Error).message}`);
        continue;
      }
      for (const p of places) {
        if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
        if (found.has(p.id)) continue; // first (highest-priority) category wins
        found.set(p.id, {
          placeId: p.id,
          name: p.displayName?.text ?? "",
          category: group.category,
          coords: p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null,
          address: p.formattedAddress?.replace(/, South Africa$/, "") ?? null,
          rating: p.rating ?? null,
          reviewCount: p.userRatingCount ?? null,
          priceLevel: p.priceLevel ?? null,
          summary: p.editorialSummary?.text ?? null,
          primaryType: p.primaryTypeDisplayName?.text ?? null,
          types: p.types ?? [],
        });
      }
      await sleep(120);
    }
  }

  const list = [...found.values()].sort(
    (a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
  );
  mkdirSync(dirname(candidatesFile(area)), { recursive: true });
  writeFileSync(candidatesFile(area), JSON.stringify(list, null, 2) + "\n", "utf8");

  const byCat: Record<string, number> = {};
  for (const c of list) byCat[c.category] = (byCat[c.category] ?? 0) + 1;
  console.log(`\n${list.length} places found in ${calls} searches:`);
  for (const [cat, n] of Object.entries(byCat)) console.log(`  ${cat.padEnd(8)} ${n}`);
  console.log(`\nWrote ${candidatesFile(area)}`);
  console.log(`Review it, then: npm run places:discover ${area} import`);
}

/** Discovered spots share the curated seed shape; enrichment fills live facts. */
interface DiscoveredSpot {
  id: string;
  name: string;
  category: Category;
  area: AreaId;
  coords: { lat: number; lng: number } | null;
  priceBand: PriceBand;
  priceEstimate: string;
  rating: number;
  reviewCount: number;
  address: string | null;
  phone: string | null;
  tags: string[];
  blurb: string;
}

const PRICE_BANDS: Record<string, { band: PriceBand; estimate: string }> = {
  PRICE_LEVEL_FREE: { band: 0, estimate: "Free" },
  PRICE_LEVEL_INEXPENSIVE: { band: 1, estimate: "R50–120 pp" },
  PRICE_LEVEL_MODERATE: { band: 2, estimate: "R120–250 pp" },
  PRICE_LEVEL_EXPENSIVE: { band: 3, estimate: "R250–450 pp" },
  PRICE_LEVEL_VERY_EXPENSIVE: { band: 3, estimate: "R450+ pp" },
};

function slugify(name: string, taken: Set<string>): string {
  const base =
    name
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "spot";
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  taken.add(slug);
  return slug;
}

/** Suburb from "12 Main Rd, Table View, Cape Town, 7439" → "Table View". */
function suburbOf(address: string | null): string | null {
  const parts = address?.split(",").map((s) => s.trim()) ?? [];
  return parts.length >= 3 ? parts[parts.length - 3] : null;
}

function toSpot(c: Candidate, area: AreaId, taken: Set<string>): DiscoveredSpot {
  const free = c.category === "outdoor" || c.priceLevel === "PRICE_LEVEL_FREE";
  const price = free
    ? { band: 0 as PriceBand, estimate: "Free" }
    : (PRICE_BANDS[c.priceLevel ?? ""] ?? { band: 2 as PriceBand, estimate: "R120–250 pp" });
  const suburb = suburbOf(c.address);
  const blurb =
    c.summary ??
    (c.primaryType
      ? `${c.primaryType}${suburb ? ` in ${suburb}` : ""}.`
      : `Local spot${suburb ? ` in ${suburb}` : ""}.`);
  const tags = c.types
    .filter((t) => !["point_of_interest", "establishment", "food", "store"].includes(t))
    .slice(0, 3)
    .map((t) => t.replace(/_/g, " "));
  return {
    id: slugify(c.name, taken),
    name: c.name,
    category: c.category,
    area,
    coords: c.coords,
    priceBand: price.band,
    priceEstimate: price.estimate,
    rating: c.rating ?? 0,
    reviewCount: c.reviewCount ?? 0,
    address: c.address,
    phone: null, // filled by places:refresh
    tags,
    blurb,
  };
}

/** Mirrors enrich-places.ts's MatchEntry shape, kept local to avoid a cross-script import. */
interface MatchEntry {
  placeId: string;
  googleName: string;
  address: string;
}

/**
 * A raw Nearby Search sweep returns real venues alongside noise a curated
 * guide shouldn't surface: national chains, supermarkets, generic commercial
 * gyms (not "an activity"), near-zero-review listings, and duplicate Google
 * POIs for the same physical place (very common for beaches/parks). Filtered
 * here so `import` yields guide-quality candidates by default; the full raw
 * sweep stays in candidates/<area>.json to hand-pick from if this is too strict.
 */
const CHAIN_BLOCKLIST =
  /\b(mcdonald'?s?|kfc|burger king|steers|nando'?s|wimpy|spur\b|cattle baron|seattle coffee|mugg ?&? ?bean|ocean basket|panarottis|col'?cacchio|checkers|pick n pay|pick ?'?n ?pay|spar\b|woolworths|shoprite|dis-?chem|clicks|virgin active|planet fitness|sasol|engen|caltex|shell garage|total garage)\b/i;
const TYPE_BLOCKLIST = new Set([
  "Gym",
  "Hypermarket",
  "Supermarket",
  "Convenience Store",
  "Gas Station",
  "Petrol Station",
]);
const MIN_REVIEWS = 15;
/** Same-category candidates closer than this are treated as the same real-world place. */
const DEDUPE_RADIUS_KM = 0.3;

function qualityFilter(candidates: Candidate[]): { kept: Candidate[]; excluded: Record<string, number> } {
  const excluded: Record<string, number> = { chain: 0, type: 0, reviews: 0, duplicate: 0 };
  const pass1 = candidates.filter((c) => {
    if (CHAIN_BLOCKLIST.test(c.name)) return (excluded.chain++, false);
    if (c.primaryType && TYPE_BLOCKLIST.has(c.primaryType)) return (excluded.type++, false);
    if ((c.reviewCount ?? 0) < MIN_REVIEWS) return (excluded.reviews++, false);
    return true;
  });

  // Dedupe: within each category, sort by review count desc and drop anything
  // that lands within DEDUPE_RADIUS_KM of an already-kept candidate.
  const kept: Candidate[] = [];
  for (const group of Object.values(
    pass1.reduce<Record<string, Candidate[]>>((acc, c) => {
      (acc[c.category] ??= []).push(c);
      return acc;
    }, {})
  )) {
    const sorted = [...group].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    const acceptedInCategory: Candidate[] = [];
    for (const c of sorted) {
      const tooClose =
        c.coords &&
        acceptedInCategory.some(
          (k) => k.coords && haversineKm(c.coords!, k.coords!) < DEDUPE_RADIUS_KM
        );
      if (tooClose) {
        excluded.duplicate++;
        continue;
      }
      acceptedInCategory.push(c);
      kept.push(c);
    }
  }
  return { kept, excluded };
}

async function runImport(area: AreaId) {
  if (!existsSync(candidatesFile(area))) {
    console.error(`No candidates for "${area}": run npm run places:discover ${area} first.`);
    process.exit(1);
  }
  const rawCandidates: Candidate[] = JSON.parse(readFileSync(candidatesFile(area), "utf8"));
  const { kept: candidates, excluded } = qualityFilter(rawCandidates);
  console.log(
    `Quality filter: ${rawCandidates.length} raw → ${candidates.length} kept ` +
      `(excluded: ${excluded.chain} chain, ${excluded.type} generic-type, ` +
      `${excluded.reviews} low-review, ${excluded.duplicate} duplicate-location)`
  );
  const matches: Record<string, MatchEntry | null> = JSON.parse(readFileSync(MATCH_FILE, "utf8"));
  const discovered: DiscoveredSpot[] = existsSync(DISCOVERED_FILE)
    ? JSON.parse(readFileSync(DISCOVERED_FILE, "utf8"))
    : [];

  const knownPlaceIds = new Set(
    Object.values(matches)
      .filter((m): m is MatchEntry => m !== null)
      .map((m) => m.placeId)
  );
  const taken = new Set<string>(discovered.map((d) => d.id));
  // Curated ids must stay unique too.
  const { SPOTS } = await import("../lib/data/spots");
  for (const s of SPOTS) taken.add(s.id);

  let added = 0;
  for (const c of candidates) {
    if (knownPlaceIds.has(c.placeId)) continue; // already curated or imported
    if (!c.name || !c.coords) continue;
    const spot = toSpot(c, area, taken);
    discovered.push(spot);
    matches[spot.id] = { placeId: c.placeId, googleName: c.name, address: c.address ?? "" };
    knownPlaceIds.add(c.placeId);
    added++;
  }

  writeFileSync(DISCOVERED_FILE, JSON.stringify(discovered, null, 2) + "\n", "utf8");
  writeFileSync(MATCH_FILE, JSON.stringify(matches, null, 2) + "\n", "utf8");
  console.log(`Imported ${added} new spots (${discovered.length} discovered total).`);
  console.log("Now run: npm run places:refresh && npm run seed:sql");
}

async function main() {
  const area = process.argv[2] as AreaId | undefined;
  const doImport = process.argv[3] === "import";
  if (!area) {
    console.error("Usage: tsx scripts/discover-places.ts <area> [import]");
    process.exit(1);
  }
  if (doImport) await runImport(area);
  else await runDiscover(area);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
