/**
 * Bulk venue discovery via Google Places (SPEC §9 "provider enrichment",
 * scaled up): sweep, dedupe, auto-categorise, and stage the results.
 *
 * Area mode (Nearby Search over suburb tiles):
 *   npm run places:discover <area>          : sweep, write candidates JSON,
 *                                             print a category summary
 *   npm run places:discover <area> import   : merge candidates into
 *                                             lib/data/discovered.json and
 *                                             places-match.json (then run
 *                                             places:refresh + seed:sql)
 *
 * Activity mode (Text Search across the whole Western Cape, because "quad
 * biking" is a query, not a Google place type):
 *   npm run places:discover activity <key|all>          : sweep
 *   npm run places:discover activity <key|all> import   : import
 * Keys come from ACTIVITY_SWEEPS below and must match lib/data/spots
 * ACTIVITIES; imported venues get the activity tag stamped into their tags,
 * which is what the Discover activity chips filter on. Venues land in the
 * area (metro suburb or region: winelands/overberg/westcoast/gardenroute)
 * whose anchor is nearest.
 *
 * Discovered spots ride the same enrichment pipeline as curated ones; their
 * blurbs come from Google's editorial summary (or a plain type/suburb line)
 * until someone writes a proper one, so curate over time.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AREA_IDS, type AreaId, type Category, type PriceBand } from "../lib/types";
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
  durbanville: [
    { lat: -33.8305, lng: 18.6501, radius: 1800 }, // Durbanville town centre
    { lat: -33.825, lng: 18.635, radius: 2000 }, // Sonstraal / Vergesig / Uitzicht
    { lat: -33.815, lng: 18.68, radius: 3000 }, // Durbanville wine valley (Hills, Nitida, De Grendel)
    { lat: -33.9, lng: 18.629, radius: 2800 }, // Bellville
    { lat: -33.845, lng: 18.708, radius: 2800 }, // Kraaifontein
    { lat: -33.868, lng: 18.7, radius: 2800 }, // Brackenfell
  ],
  winelands: [
    { lat: -33.9367, lng: 18.861, radius: 2500 }, // Stellenbosch town
    { lat: -33.98, lng: 18.85, radius: 4000 }, // Stellenbosch wine route south (R44)
    { lat: -33.9, lng: 18.78, radius: 4500 }, // Bottelary / Koelenhof
    { lat: -33.9106, lng: 19.1216, radius: 4000 }, // Franschhoek
    { lat: -33.7342, lng: 18.9621, radius: 4000 }, // Paarl town
    { lat: -33.82, lng: 18.92, radius: 5000 }, // Simondium / Klapmuts
    { lat: -34.0787, lng: 18.8433, radius: 4000 }, // Somerset West / Helderberg
  ],
  // Dense inner-city core: small radii because the CBD/Gardens packs more
  // than 20 venues into a few blocks (Nearby Search caps at 20 per call).
  citybowl: [
    { lat: -33.922, lng: 18.419, radius: 700 }, // Long St / Bree St / CBD
    { lat: -33.9255, lng: 18.4235, radius: 650 }, // Company's Garden / St George's Mall
    { lat: -33.93, lng: 18.411, radius: 750 }, // Kloof St / Gardens
    { lat: -33.9335, lng: 18.418, radius: 800 }, // Oranjezicht / Vredehoek
    { lat: -33.919, lng: 18.413, radius: 550 }, // Bo-Kaap
    { lat: -33.9155, lng: 18.4115, radius: 700 }, // De Waterkant / Loader St
    { lat: -33.927, lng: 18.427, radius: 800 }, // East City / District Six fringe
  ],
  seapoint: [
    { lat: -33.9155, lng: 18.385, radius: 900 }, // Sea Point Main / Regent Rd
    { lat: -33.912, lng: 18.383, radius: 700 }, // Sea Point promenade / Beach Rd
    { lat: -33.9075, lng: 18.4005, radius: 1100 }, // Green Point / Three Anchor Bay
    { lat: -33.8995, lng: 18.405, radius: 800 }, // Mouille Point
    { lat: -33.9245, lng: 18.378, radius: 1000 }, // Fresnaye / Bantry Bay
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
    // "winery" lands here on purpose: a wine-farm tasting afternoon reads as
    // a chill outing, not nightlife.
    types: ["garden", "botanical_garden", "picnic_ground", "plaza", "spa", "observation_deck", "winery"],
  },
  {
    // Gyms/yoga studios/member sports clubs proved to be guide noise
    // (see the 2026-07 junk prune); only bookable activity venues remain.
    category: "classes",
    types: ["sports_activity_location"],
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

/**
 * Text Search sweeps per activity chip (lib/data/spots ACTIVITIES). The tag
 * stamped on import is looked up from ACTIVITIES by key, so chip filtering
 * and the sweep can never drift apart.
 */
const ACTIVITY_SWEEPS: Record<string, { query: string; category: Category; sig: RegExp }> = {
  quad: { query: "quad biking", category: "outdoor", sig: /quad|atv|4x4|off.?road|motocross|dune|bugg/i },
  paraglide: { query: "paragliding", category: "outdoor", sig: /paraglid|parapent|tandem/i },
  kayak: { query: "kayak tours", category: "outdoor", sig: /kayak|canoe|paddle/i },
  horse: { query: "horse riding trails", category: "outdoor", sig: /horse|equestrian|stable|ranch|pony/i },
  sandboard: { query: "sandboarding", category: "outdoor", sig: /sand.?board/i },
  zipline: { query: "zipline canopy tour", category: "outdoor", sig: /zip.?lin|canopy|acrobranch|aerial|tree.?top/i },
  sharks: { query: "shark cage diving", category: "outdoor", sig: /shark/i },
  surf: { query: "surf school", category: "classes", sig: /surf/i },
  kite: { query: "kitesurfing lessons", category: "classes", sig: /kite|wing.?foil|windsurf/i },
  // Pick-your-own farms are family outings; their signature is farm-ish
  // naming since Google types them as plain farms or tourist attractions.
  strawberries: {
    query: "strawberry picking farm",
    category: "family",
    sig: /strawberr|berry|berrie/i,
  },
  fruitpick: {
    query: "pick your own fruit farm",
    category: "family",
    sig: /fruit|apple|orange|citrus|cherr|peach|plum|fig\b|oliv/i,
  },
  flowerpick: {
    query: "flower picking farm",
    category: "family",
    sig: /flower|lavender|protea|fynbos|rose|bloom|dahlia|tulp|tulip/i,
  },
  // Hiking is dense across the Cape; the signature leans on trail/peak/kloof
  // naming, with hiking_area/national_park/nature-reserve types catching the
  // rest. Bike/horse "trails" that slip in get pruned at import review.
  hike: {
    query: "hiking trail",
    category: "outdoor",
    sig: /\bhik|\btrail|kloof|gorge|ravine|\bpeak\b|summit|\bnek\b|waterfall|nature reserve|forest|buttress|contour|pipe track|mountain\b/i,
  },
};

/** Retail masquerading as activity results (board shops, repair benches). */
const RETAIL_NAME = /\b(shop|store|factory|repairs?)\b/i;

/**
 * Text Search relevance is fuzzy: a "quad biking" sweep surfaces paragliding
 * schools, bike shops, and canyoning outfits as "related". A candidate stays
 * in an activity's import when its name matches the activity's signature, or
 * when it at least looks like an activity venue by type AND doesn't clearly
 * belong to a different activity by name (those get picked up, correctly
 * tagged, by their own sweep).
 */
const ACTIVITY_OK_TYPES = new Set([
  "adventure_sports_center",
  "sports_activity_location",
  "sports_complex",
  "tour_agency",
  "travel_agency",
  "tourist_attraction",
  "off_roading_area",
  "race_course",
  "campground",
  "park",
  "hiking_area",
  "national_park",
  "nature_preserve",
  "state_park",
  "marina",
  "amusement_park",
  "amusement_center",
  "water_park",
]);
/** Activities we don't sweep but that show up as "related" noise. */
const OTHER_ACTIVITY_SIGS = [
  /canyon|kloof|abseil/i,
  /paintball/i,
  /segway|scooter|scootour/i,
  /fat.?bike/i,
  /bungee|bungy/i,
  /go.?kart/i,
];

function activityRelevanceFilter(
  candidates: Candidate[],
  key: string
): { kept: Candidate[]; dropped: number } {
  const own = ACTIVITY_SWEEPS[key].sig;
  const otherSigs = [
    ...Object.entries(ACTIVITY_SWEEPS)
      .filter(([k]) => k !== key)
      .map(([, v]) => v.sig),
    ...OTHER_ACTIVITY_SIGS,
  ];
  const kept = candidates.filter((c) => {
    if (RETAIL_NAME.test(c.name)) return false;
    if (own.test(c.name)) return true;
    if (!c.types.some((t) => ACTIVITY_OK_TYPES.has(t))) return false;
    return !otherSigs.some((r) => r.test(c.name));
  });
  return { kept, dropped: candidates.length - kept.length };
}

/**
 * Western Cape coverage for activity sweeps. Text Search locationBias caps
 * at 50km, so the province is tiled town-by-town; results outside WC_BOUNDS
 * are dropped (bias is a preference, not a fence).
 */
const WC_TILES: Circle[] = [
  { lat: -33.93, lng: 18.46, radius: 40000 }, // Cape Town metro
  { lat: -33.57, lng: 18.42, radius: 30000 }, // Atlantis dunes / Melkbos
  { lat: -33.05, lng: 18.03, radius: 45000 }, // Langebaan / Vredenburg / Paternoster
  { lat: -33.93, lng: 18.86, radius: 30000 }, // Stellenbosch / Franschhoek
  { lat: -33.72, lng: 19.01, radius: 30000 }, // Paarl / Wellington
  { lat: -33.36, lng: 19.31, radius: 45000 }, // Ceres / Tulbagh / Worcester
  { lat: -34.15, lng: 19.04, radius: 35000 }, // Elgin / Grabouw / Kleinmond
  { lat: -34.42, lng: 19.3, radius: 40000 }, // Hermanus / Stanford
  { lat: -34.58, lng: 19.53, radius: 30000 }, // Gansbaai
  { lat: -34.02, lng: 20.45, radius: 45000 }, // Swellendam / western Route 62
  { lat: -33.6, lng: 22.2, radius: 50000 }, // Oudtshoorn / Cango Valley
  { lat: -34.15, lng: 22.1, radius: 45000 }, // Mossel Bay / George
  { lat: -33.98, lng: 22.85, radius: 45000 }, // Wilderness / Sedgefield / Knysna
  { lat: -34.05, lng: 23.35, radius: 40000 }, // Plettenberg Bay / Tsitsikamma edge
];

/** Rough Western Cape bounding box for filtering biased-but-global results. */
const WC_BOUNDS = { minLat: -34.9, maxLat: -31.0, minLng: 17.0, maxLng: 24.6 };

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

/** Text Search sweep call: same field mask as Nearby, query-driven. */
async function searchActivity(query: string, circle: Circle): Promise<GoogleNearbyPlace[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
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
      textQuery: query,
      pageSize: 20,
      locationBias: {
        circle: {
          center: { latitude: circle.lat, longitude: circle.lng },
          radius: circle.radius,
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`searchText ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { places?: GoogleNearbyPlace[] };
  return data.places ?? [];
}

const inWesternCape = (p: GoogleNearbyPlace) =>
  !!p.location &&
  p.location.latitude >= WC_BOUNDS.minLat &&
  p.location.latitude <= WC_BOUNDS.maxLat &&
  p.location.longitude >= WC_BOUNDS.minLng &&
  p.location.longitude <= WC_BOUNDS.maxLng;

const activityCandidatesFile = (key: string) =>
  join(ROOT, "lib", "data", "candidates", `activity-${key}.json`);

async function runDiscoverActivity(key: string) {
  const sweep = ACTIVITY_SWEEPS[key];
  const { ACTIVITIES } = await import("../lib/data/spots");
  const act = ACTIVITIES.find((a) => a.key === key);
  if (!sweep || !act) {
    console.error(
      `Unknown activity "${key}". Known: ${Object.keys(ACTIVITY_SWEEPS).join(", ")}`
    );
    process.exit(1);
  }

  const found = new Map<string, Candidate>();
  let calls = 0;
  for (const tile of WC_TILES) {
    let places: GoogleNearbyPlace[];
    try {
      places = await searchActivity(sweep.query, tile);
      calls++;
    } catch (err) {
      console.warn(`  ! ${key} @ ${tile.lat},${tile.lng}: ${(err as Error).message}`);
      continue;
    }
    for (const p of places) {
      if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
      if (!inWesternCape(p)) continue;
      if (found.has(p.id)) continue;
      found.set(p.id, {
        placeId: p.id,
        name: p.displayName?.text ?? "",
        category: sweep.category,
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

  const list = [...found.values()].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  mkdirSync(dirname(activityCandidatesFile(key)), { recursive: true });
  writeFileSync(activityCandidatesFile(key), JSON.stringify(list, null, 2) + "\n", "utf8");
  console.log(`\n[${act.label}] ${list.length} places found in ${calls} searches.`);
  console.log(`Wrote ${activityCandidatesFile(key)}`);
  console.log(`Review it, then: npm run places:discover activity ${key} import`);
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
/**
 * Adventure operators in small towns collect reviews far slower than metro
 * restaurants, so activity imports use a lower floor.
 */
const MIN_REVIEWS_ACTIVITY = 8;
/** Same-category candidates closer than this are treated as the same real-world place. */
const DEDUPE_RADIUS_KM = 0.3;

function qualityFilter(
  candidates: Candidate[],
  minReviews: number
): { kept: Candidate[]; excluded: Record<string, number> } {
  const excluded: Record<string, number> = { chain: 0, type: 0, reviews: 0, duplicate: 0 };
  const pass1 = candidates.filter((c) => {
    if (CHAIN_BLOCKLIST.test(c.name)) return (excluded.chain++, false);
    if (c.primaryType && TYPE_BLOCKLIST.has(c.primaryType)) return (excluded.type++, false);
    if ((c.reviewCount ?? 0) < minReviews) return (excluded.reviews++, false);
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

/** Shared import tail: quality-filter a candidates file, map, and stage. */
async function importCandidates(
  file: string,
  minReviews: number,
  map: (c: Candidate, taken: Set<string>) => DiscoveredSpot | null,
  opts: {
    /** Extra relevance pass before the quality filter (activity mode). */
    prefilter?: (cands: Candidate[]) => { kept: Candidate[]; dropped: number };
    /** Already-imported venue seen again: merge (e.g. add an activity tag). */
    onKnown?: (existing: DiscoveredSpot) => boolean;
  } = {}
) {
  if (!existsSync(file)) {
    console.error(`No candidates file ${file}: run the matching sweep first.`);
    process.exit(1);
  }
  let rawCandidates: Candidate[] = JSON.parse(readFileSync(file, "utf8"));
  if (opts.prefilter) {
    const { kept, dropped } = opts.prefilter(rawCandidates);
    console.log(`Relevance filter: dropped ${dropped} off-activity candidates`);
    rawCandidates = kept;
  }
  const { kept: candidates, excluded } = qualityFilter(rawCandidates, minReviews);
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
  const spotIdByPlaceId = new Map(
    Object.entries(matches)
      .filter((e): e is [string, MatchEntry] => e[1] !== null)
      .map(([sid, m]) => [m.placeId, sid])
  );
  const taken = new Set<string>(discovered.map((d) => d.id));
  // Curated ids must stay unique too.
  const { SPOTS } = await import("../lib/data/spots");
  for (const s of SPOTS) taken.add(s.id);

  let added = 0;
  let merged = 0;
  for (const c of candidates) {
    if (knownPlaceIds.has(c.placeId)) {
      // Multi-activity operators (one venue, several sweeps) get their extra
      // tags merged instead of being claimed once and lost thereafter.
      if (opts.onKnown) {
        const sid = spotIdByPlaceId.get(c.placeId);
        const existing = sid ? discovered.find((d) => d.id === sid) : undefined;
        if (existing && opts.onKnown(existing)) merged++;
      }
      continue;
    }
    if (!c.name || !c.coords) continue;
    const spot = map(c, taken);
    if (!spot) continue;
    discovered.push(spot);
    matches[spot.id] = { placeId: c.placeId, googleName: c.name, address: c.address ?? "" };
    knownPlaceIds.add(c.placeId);
    added++;
  }

  writeFileSync(DISCOVERED_FILE, JSON.stringify(discovered, null, 2) + "\n", "utf8");
  writeFileSync(MATCH_FILE, JSON.stringify(matches, null, 2) + "\n", "utf8");
  console.log(
    `Imported ${added} new spots` +
      (merged ? `, merged tags into ${merged} existing` : "") +
      ` (${discovered.length} discovered total).`
  );
  console.log("Now run: npm run places:refresh && npm run seed:sql");
}

async function runImport(area: AreaId) {
  await importCandidates(candidatesFile(area), MIN_REVIEWS, (c, taken) => toSpot(c, area, taken));
}

async function runImportActivity(key: string) {
  const sweep = ACTIVITY_SWEEPS[key];
  const { ACTIVITIES, AREA_ANCHORS } = await import("../lib/data/spots");
  const act = ACTIVITIES.find((a) => a.key === key);
  if (!sweep || !act) {
    console.error(`Unknown activity "${key}". Known: ${Object.keys(ACTIVITY_SWEEPS).join(", ")}`);
    process.exit(1);
  }

  const nearestArea = (coords: { lat: number; lng: number }): AreaId => {
    let best: AreaId = "citybowl";
    let bestKm = Infinity;
    for (const [id, anchor] of Object.entries(AREA_ANCHORS) as [
      AreaId,
      { lat: number; lng: number },
    ][]) {
      const km = haversineKm(coords, anchor);
      if (km < bestKm) {
        bestKm = km;
        best = id;
      }
    }
    return best;
  };

  const importMapper = (c: Candidate, taken: Set<string>): DiscoveredSpot | null => {
    if (!c.coords) return null;
    const suburb = suburbOf(c.address);
    // No outdoor→free heuristic here: operators charge even when Google has
    // no price level. Honest default over an invented rand figure.
    const price = PRICE_BANDS[c.priceLevel ?? ""] ?? {
      band: 2 as PriceBand,
      estimate: "Prices vary · book ahead",
    };
    const typeTags = c.types
      .filter((t) => !["point_of_interest", "establishment", "food", "store"].includes(t))
      .slice(0, 2)
      .map((t) => t.replace(/_/g, " "));
    return {
      id: slugify(c.name, taken),
      name: c.name,
      category: sweep.category,
      area: nearestArea(c.coords),
      coords: c.coords,
      priceBand: price.band,
      priceEstimate: price.estimate,
      rating: c.rating ?? 0,
      reviewCount: c.reviewCount ?? 0,
      address: c.address,
      phone: null, // filled by places:refresh
      tags: [act.tag, ...typeTags.filter((t) => t !== act.tag)].slice(0, 4),
      blurb: c.summary ?? `${act.label} ${suburb ? `near ${suburb}` : "in the Western Cape"}.`,
    };
  };

  await importCandidates(activityCandidatesFile(key), MIN_REVIEWS_ACTIVITY, importMapper, {
    prefilter: (cands) => activityRelevanceFilter(cands, key),
    onKnown: (existing) => {
      if (existing.tags.some((t) => t.toLowerCase() === act.tag)) return false;
      existing.tags = [...existing.tags, act.tag];
      return true;
    },
  });
}

async function main() {
  const [, , first, second, third] = process.argv;
  if (first === "activity") {
    const doImport = third === "import";
    if (!second) {
      console.error("Usage: tsx scripts/discover-places.ts activity <key|all> [import]");
      process.exit(1);
    }
    const keys = second === "all" ? Object.keys(ACTIVITY_SWEEPS) : [second];
    for (const key of keys) {
      if (doImport) await runImportActivity(key);
      else await runDiscoverActivity(key);
    }
    return;
  }

  const area = first as AreaId | undefined;
  const doImport = second === "import";
  if (!area || !AREA_IDS.includes(area)) {
    console.error(
      "Usage: tsx scripts/discover-places.ts <area> [import]\n" +
        "       tsx scripts/discover-places.ts activity <key|all> [import]"
    );
    process.exit(1);
  }
  if (doImport) await runImport(area);
  else await runDiscover(area);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
