import type {
  Activity,
  Area,
  AreaId,
  Category,
  Collection,
  Interest,
  Spot,
  WeeklyHours,
} from "@/lib/types";
import { DAY_KEYS } from "@/lib/types";
import enrichmentJson from "./enrichment.json";
import discoveredJson from "./discovered.json";

/**
 * Curated seed data, ported from the design prototype (`spotsData`).
 * The prototype stored hours as one daily range + closed-day indices; here they
 * are expanded to per-day interval arrays per SPEC §6.3.
 *
 * Coordinates are approximate (added for distance/"Nearest"; the prototype faked
 * distance). TODO: verify coords against a places provider (SPEC §7).
 */

const SEED_UPDATED_AT = "2026-07-11";

function wk(open: string, close: string, closedDays: number[] = []): WeeklyHours {
  const out = {} as WeeklyHours;
  DAY_KEYS.forEach((day, i) => {
    out[day] = closedDays.includes(i) ? [] : [{ open, close }];
  });
  return out;
}

const OPEN_24H = wk("00:00", "24:00");

interface SeedSpot {
  id: string;
  name: string;
  category: Category;
  area: Spot["area"];
  coords: { lat: number; lng: number };
  priceBand: Spot["priceBand"];
  priceEstimate: string;
  rating: number;
  reviewCount: number;
  hours: WeeklyHours;
  address: string;
  phone: string | null;
  tags: string[];
  blurb: string;
}

/**
 * Bulk-discovered spots (scripts/discover-places.ts, SPEC §9 provider
 * enrichment, scaled up via Nearby Search sweeps). Same shape as the curated
 * seed minus `hours`, which real facts fill in via the enrichment overlay
 * below; OPEN_24H is a placeholder for the rare miss.
 */
interface DiscoveredSpot {
  id: string;
  name: string;
  category: Category;
  area: Spot["area"];
  coords: { lat: number; lng: number } | null;
  priceBand: Spot["priceBand"];
  priceEstimate: string;
  rating: number;
  reviewCount: number;
  address: string | null;
  phone: string | null;
  tags: string[];
  blurb: string;
}
const discovered = discoveredJson as DiscoveredSpot[];

const seed: SeedSpot[] = [
  // ---- Restaurants & Cafés ----
  {
    id: "truth",
    name: "Truth Coffee Roasting",
    category: "eat",
    area: "citybowl",
    coords: { lat: -33.928, lng: 18.4234 },
    priceBand: 2,
    priceEstimate: "R55–90 pp",
    rating: 4.7,
    reviewCount: 1840,
    hours: wk("07:00", "18:00", [6]),
    address: "36 Buitenkant St, City Centre",
    phone: "+27 21 200 0440",
    tags: ["coffee", "industrial", "work-friendly"],
    blurb:
      "Cathedral-like steampunk roastery pulling some of the best espresso in the city. Come for the coffee, stay for the theatre.",
  },
  {
    id: "kloof",
    name: "Kloof Street House",
    category: "eat",
    area: "citybowl",
    coords: { lat: -33.9312, lng: 18.4107 },
    priceBand: 3,
    priceEstimate: "R180–320 pp",
    rating: 4.6,
    reviewCount: 2210,
    hours: wk("12:00", "23:00"),
    address: "30 Kloof St, Gardens",
    phone: "+27 21 423 4413",
    tags: ["romantic", "garden", "dinner"],
    blurb:
      "A candle-lit Victorian house with a fairy-lit garden: the go-to for a special, slightly bohemian dinner.",
  },
  {
    id: "superette",
    name: "Superette",
    category: "eat",
    area: "woodstock",
    coords: { lat: -33.9271, lng: 18.4565 },
    priceBand: 1,
    priceEstimate: "R60–110 pp",
    rating: 4.5,
    reviewCount: 640,
    hours: wk("08:00", "15:30", [6]),
    address: "66 Albert Rd, Woodstock",
    phone: "+27 21 802 5525",
    tags: ["brunch", "light lunch", "local"],
    blurb:
      "Bright corner café inside the Woodstock arts precinct with seasonal salads, sandwiches and excellent baking.",
  },
  {
    id: "kalkfish",
    name: "Kalk Bay Harbour Fish & Chips",
    category: "eat",
    area: "muizenberg",
    coords: { lat: -34.1287, lng: 18.4489 },
    priceBand: 1,
    priceEstimate: "R70–120 pp",
    rating: 4.3,
    reviewCount: 980,
    hours: wk("11:00", "19:00"),
    address: "Kalk Bay Harbour, Main Rd",
    phone: "+27 21 788 1120",
    tags: ["seafood", "casual", "harbour"],
    blurb:
      "Fresh line-fish and chips eaten off the harbour wall while the seals beg. Peak lowkey Cape Town.",
  },
  {
    id: "bootlegger",
    name: "Bootlegger Coffee Co.",
    category: "eat",
    area: "seapoint",
    coords: { lat: -33.9214, lng: 18.3843 },
    priceBand: 1,
    priceEstimate: "R45–85 pp",
    rating: 4.4,
    reviewCount: 1120,
    hours: wk("06:30", "18:00"),
    address: "80 Regent Rd, Sea Point",
    phone: "+27 21 433 2334",
    tags: ["coffee", "laptop-friendly", "breakfast"],
    blurb:
      "Reliable neighbourhood roaster: plug in, order a flat white and a bacon-and-egg roll, and settle in.",
  },
  {
    id: "ontherocks",
    name: "On the Rocks",
    category: "eat",
    area: "blouberg",
    coords: { lat: -33.8069, lng: 18.4636 },
    priceBand: 3,
    priceEstimate: "R220–380 pp",
    rating: 4.3,
    reviewCount: 1900,
    hours: wk("12:00", "22:00"),
    address: "45 Stadler Rd, Bloubergstrand",
    phone: "+27 21 554 1988",
    tags: ["seafood", "sea views", "special occasion"],
    blurb:
      "White-linen seafood right on the Bloubergstrand rocks: breakers under the window, Table Mountain across the bay.",
  },

  // ---- Bars & Nightlife ----
  {
    id: "yourstruly",
    name: "Yours Truly",
    category: "bars",
    area: "citybowl",
    coords: { lat: -33.9318, lng: 18.4103 },
    priceBand: 2,
    priceEstimate: "R60–120 pp",
    rating: 4.3,
    reviewCount: 760,
    hours: wk("10:00", "23:59"),
    address: "73 Kloof St, Gardens",
    phone: "+27 21 426 2035",
    tags: ["lively", "craft beer", "young crowd"],
    blurb:
      "Buzzy Kloof Street bar-café with a rooftop, craft beers on tap and a permanently good-time crowd.",
  },
  {
    id: "causeeffect",
    name: "Cause|Effect Cocktail Bar",
    category: "bars",
    area: "waterfront",
    coords: { lat: -33.9205, lng: 18.4186 },
    priceBand: 2,
    priceEstimate: "R90–150 pp",
    rating: 4.5,
    reviewCount: 540,
    hours: wk("12:00", "23:59"),
    address: "Shortmarket St, City Centre",
    phone: "+27 21 422 3040",
    tags: ["cocktails", "brandy", "date night"],
    blurb:
      "Cape brandy bar with inventive cocktails and a warm, low-lit room: a proper grown-up night out.",
  },
  {
    id: "sundowners",
    name: "Camps Bay Sundowner Deck",
    category: "bars",
    area: "campsbay",
    coords: { lat: -33.9516, lng: 18.3781 },
    priceBand: 3,
    priceEstimate: "R120–220 pp",
    rating: 4.6,
    reviewCount: 1980,
    hours: wk("11:00", "23:00"),
    address: "Victoria Rd, Camps Bay",
    phone: "+27 21 438 0000",
    tags: ["sunset", "sea views", "glamorous"],
    blurb:
      "Cocktail in hand, feet toward the Twelve Apostles, sun melting into the Atlantic. The classic Cape Town sundowner.",
  },
  {
    id: "bluepeter",
    name: "The Blue Peter Hotel",
    category: "bars",
    area: "blouberg",
    coords: { lat: -33.8046, lng: 18.4643 },
    priceBand: 2,
    priceEstimate: "R90–160 pp",
    rating: 4.2,
    reviewCount: 2600,
    hours: wk("11:00", "23:00"),
    address: "Popham Rd, Bloubergstrand",
    phone: "+27 21 554 1956",
    tags: ["sundowners", "lawn", "institution"],
    blurb:
      "Pizza and a cold one on the sloping lawn while the sun drops behind Robben Island. Blouberg's sundowner institution for decades.",
  },

  // ---- Outdoors ----
  {
    id: "tablemtn",
    name: "Table Mountain (Platteklip / Cableway)",
    category: "outdoor",
    area: "tablemtn",
    coords: { lat: -33.9486, lng: 18.4034 },
    priceBand: 0,
    priceEstimate: "Free hike · R395 cable return",
    rating: 4.9,
    reviewCount: 12400,
    hours: wk("08:00", "18:00"),
    address: "Tafelberg Rd, Table Mountain",
    phone: "+27 21 424 8181",
    tags: ["hiking", "views", "iconic"],
    blurb:
      "Hike Platteklip Gorge or ride the rotating cable car to the top of the city’s flat-topped icon. Endless views both ways.",
  },
  {
    id: "lionshead",
    name: "Lion’s Head Sunset Hike",
    category: "outdoor",
    area: "citybowl",
    coords: { lat: -33.9351, lng: 18.3983 },
    priceBand: 0,
    priceEstimate: "Free",
    rating: 4.8,
    reviewCount: 5600,
    hours: OPEN_24H,
    address: "Signal Hill Rd trailhead",
    phone: null,
    tags: ["hiking", "sunset", "360° views"],
    blurb:
      "A spiralling 45–60 min climb to a 360° summit. Locals do it on full-moon nights with headlamps.",
  },
  {
    id: "campsbeach",
    name: "Camps Bay Beach",
    category: "outdoor",
    area: "campsbay",
    coords: { lat: -33.9506, lng: 18.3776 },
    priceBand: 0,
    priceEstimate: "Free",
    rating: 4.7,
    reviewCount: 8900,
    hours: OPEN_24H,
    address: "Victoria Rd, Camps Bay",
    phone: null,
    tags: ["beach", "palm-lined", "people-watching"],
    blurb:
      "Wide white sand under the mountains, lined with palms and cafés. Cold Atlantic water, unbeatable backdrop.",
  },
  {
    id: "boulders",
    name: "Boulders Beach Penguins",
    category: "outdoor",
    area: "muizenberg",
    coords: { lat: -34.1972, lng: 18.4514 },
    priceBand: 1,
    priceEstimate: "R95 entry",
    rating: 4.7,
    reviewCount: 7300,
    hours: wk("08:00", "17:00"),
    address: "Kleintuin Rd, Simon’s Town",
    phone: "+27 21 786 2329",
    tags: ["penguins", "family", "boardwalk"],
    blurb:
      "A boardwalk through a colony of wild African penguins on a sheltered, boulder-strewn beach in Simon’s Town.",
  },
  {
    id: "seapointprom",
    name: "Sea Point Promenade",
    category: "outdoor",
    area: "seapoint",
    coords: { lat: -33.9124, lng: 18.3852 },
    priceBand: 0,
    priceEstimate: "Free",
    rating: 4.6,
    reviewCount: 4100,
    hours: OPEN_24H,
    address: "Beach Rd, Sea Point",
    phone: null,
    tags: ["walk", "ocean", "sunset run"],
    blurb:
      "A 3km paved seafront promenade: walk, run, skate or just watch the waves crash and the sun go down.",
  },
  {
    id: "bloubergbeach",
    name: "Bloubergstrand Beach",
    category: "outdoor",
    area: "blouberg",
    coords: { lat: -33.808, lng: 18.4632 },
    priceBand: 0,
    priceEstimate: "Free",
    rating: 4.6,
    reviewCount: 3800,
    hours: OPEN_24H,
    address: "Otto du Plessis Dr, Bloubergstrand",
    phone: null,
    tags: ["postcard view", "kitesurfing", "walks"],
    blurb:
      "The postcard itself: Table Mountain rising across the bay, kites carving the horizon and long white sand for lazy walks. Windy, and worth it.",
  },

  // ---- Classes ----
  {
    id: "surf",
    name: "Muizenberg Surf Lesson",
    category: "classes",
    area: "muizenberg",
    coords: { lat: -34.1083, lng: 18.4702 },
    priceBand: 2,
    priceEstimate: "R450 · 2h group",
    rating: 4.7,
    reviewCount: 430,
    hours: wk("08:00", "16:00"),
    address: "Surfer’s Corner, Beach Rd",
    phone: "+27 21 788 9366",
    tags: ["learn to surf", "beginner", "wetsuit incl."],
    blurb:
      "Gentle beach-break and warm-ish water make Muizenberg the friendliest place in the country to catch a first wave.",
  },
  {
    id: "pottery",
    name: "Woodstock Pottery Class",
    category: "classes",
    area: "woodstock",
    coords: { lat: -33.9277, lng: 18.4531 },
    priceBand: 2,
    priceEstimate: "R550 · 2.5h",
    rating: 4.6,
    reviewCount: 210,
    hours: wk("10:00", "16:30", [0, 1]),
    address: "Albert Rd, Woodstock",
    phone: "+27 21 447 1000",
    tags: ["hands-on", "date idea", "wheel throwing"],
    blurb:
      "Get your hands muddy at the wheel in a light-filled studio. Leave your piece to be fired and collect it later.",
  },
  {
    id: "capemalay",
    name: "Cape Malay Cooking Class (Bo-Kaap)",
    category: "classes",
    area: "bokaap",
    coords: { lat: -33.9212, lng: 18.4141 },
    priceBand: 3,
    priceEstimate: "R750 · half day",
    rating: 4.8,
    reviewCount: 320,
    hours: wk("10:00", "14:00", [6]),
    address: "Wale St, Bo-Kaap",
    phone: "+27 21 422 0113",
    tags: ["cooking", "culture", "you eat it"],
    blurb:
      "Roll roti and cook a fragrant curry in a family home in the Bo-Kaap, then sit down and eat the feast you made.",
  },
  {
    id: "kitesurf",
    name: "Kite Beach Kitesurfing Lesson",
    category: "classes",
    area: "blouberg",
    coords: { lat: -33.8405, lng: 18.4855 },
    priceBand: 3,
    priceEstimate: "R950–1400 / lesson",
    rating: 4.8,
    reviewCount: 320,
    hours: wk("09:00", "18:00"),
    address: "Kite Beach, Table View",
    phone: null,
    tags: ["kitesurfing", "adrenaline", "summer wind"],
    blurb:
      "Learn the city's signature sport where the south-easter howls. Beach schools handle gear, radios and patience; you bring the stoke.",
  },

  // ---- Chill Spots ----
  {
    id: "signalhill",
    name: "Signal Hill Sunset",
    category: "chill",
    area: "citybowl",
    coords: { lat: -33.9173, lng: 18.3985 },
    priceBand: 0,
    priceEstimate: "Free",
    rating: 4.7,
    reviewCount: 3200,
    hours: OPEN_24H,
    address: "Signal Hill Rd",
    phone: null,
    tags: ["picnic", "sunset", "low effort"],
    blurb:
      "Drive right up, spread a blanket, crack something cold and watch the sun drop behind the sea. Zero effort, huge payoff.",
  },
  {
    id: "obscafe",
    name: "A Hidden Obs Book Café",
    category: "chill",
    area: "obs",
    coords: { lat: -33.9374, lng: 18.4642 },
    priceBand: 1,
    priceEstimate: "R40–80 pp",
    rating: 4.4,
    reviewCount: 290,
    hours: wk("09:00", "16:00", [0]),
    address: "Lower Main Rd, Observatory",
    phone: "+27 21 447 5590",
    tags: ["quiet", "books", "slow morning"],
    blurb:
      "Mismatched armchairs, second-hand books and bottomless filter coffee in bohemian Observatory. Bring a notebook.",
  },

  // ---- Arts & Culture ----
  {
    id: "zeitz",
    name: "Zeitz MOCAA",
    category: "arts",
    area: "waterfront",
    coords: { lat: -33.9084, lng: 18.4233 },
    priceBand: 2,
    priceEstimate: "R240 entry",
    rating: 4.6,
    reviewCount: 2600,
    hours: wk("10:00", "18:00", [1]),
    address: "Silo District, V&A Waterfront",
    phone: "+27 87 350 4777",
    tags: ["contemporary art", "architecture", "Africa"],
    blurb:
      "Africa’s largest contemporary art museum, carved out of a historic grain silo. Worth it for the building alone.",
  },
  {
    id: "biscuitmill",
    name: "Old Biscuit Mill Market",
    category: "arts",
    area: "woodstock",
    coords: { lat: -33.9282, lng: 18.4577 },
    priceBand: 1,
    priceEstimate: "R50–150 pp",
    rating: 4.5,
    reviewCount: 5400,
    hours: wk("09:00", "14:00", [0, 1, 2, 3, 4, 6]),
    address: "373–375 Albert Rd, Woodstock",
    phone: "+27 21 447 8194",
    tags: ["food market", "saturday", "crafts"],
    blurb:
      "A Saturday-morning maze of food stalls, makers and design shops. Go early and go hungry.",
  },
  {
    id: "bokaapwalk",
    name: "Bo-Kaap Streets & Photos",
    category: "arts",
    area: "bokaap",
    coords: { lat: -33.9193, lng: 18.4131 },
    priceBand: 0,
    priceEstimate: "Free",
    rating: 4.7,
    reviewCount: 6100,
    hours: OPEN_24H,
    address: "Chiappini & Wale St, Bo-Kaap",
    phone: null,
    tags: ["heritage", "colourful", "walk"],
    blurb:
      "Cobbled streets of vivid painted houses on the slopes above the city: Cape Malay heritage and the most photogenic block in town.",
  },

  // ---- Family ----
  {
    id: "aquarium",
    name: "Two Oceans Aquarium",
    category: "family",
    area: "waterfront",
    coords: { lat: -33.908, lng: 18.4177 },
    priceBand: 2,
    priceEstimate: "R255 adult · R120 kids",
    rating: 4.6,
    reviewCount: 4700,
    hours: wk("09:30", "18:00"),
    address: "Dock Rd, V&A Waterfront",
    phone: "+27 21 418 3823",
    tags: ["kids", "rainy day", "sharks"],
    blurb:
      "Where the Atlantic meets the Indian Ocean, indoors: a kelp forest, a predator tank and a kids’ play zone.",
  },
  {
    id: "constantiapicnic",
    name: "Constantia Wine Farm Picnic",
    category: "family",
    area: "constantia",
    coords: { lat: -34.0252, lng: 18.4246 },
    priceBand: 3,
    priceEstimate: "R350 pp picnic",
    rating: 4.5,
    reviewCount: 1300,
    hours: wk("11:00", "16:00"),
    address: "Constantia Main Rd",
    phone: "+27 21 794 5188",
    tags: ["picnic", "wine", "lawns for kids"],
    blurb:
      "Sprawling vineyard lawns where grown-ups taste and kids run wild. Pre-book a picnic basket and claim a tree.",
  },
  {
    id: "doodles",
    name: "Doodles Beachfront",
    category: "family",
    area: "blouberg",
    coords: { lat: -33.8218, lng: 18.4832 },
    priceBand: 2,
    priceEstimate: "R90–160 pp",
    rating: 4.1,
    reviewCount: 2100,
    hours: wk("08:00", "21:00"),
    address: "Beach Blvd, Table View",
    phone: null,
    tags: ["kids", "burgers", "beachfront"],
    blurb:
      "A big, easy beachfront diner across from the sand: milkshakes, burgers and sunset views while the kids count kitesurfers.",
  },
];

/**
 * Google Places overlay, written by `npm run places:refresh` (SPEC §7, §9).
 * Curated voice (blurb, tags, price bands) stays; provider facts (hours,
 * rating, contact, coords) win when present.
 */
interface Enrichment {
  placeId: string;
  coords: { lat: number; lng: number } | null;
  rating: number | null;
  reviewCount: number | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  hours: WeeklyHours | null;
  checkedAt: string;
}
const ENRICHMENT = enrichmentJson as Record<string, Enrichment>;

/**
 * discovered.json entries lack curated hours/copy: OPEN_24H is a stopgap the
 * enrichment overlay below immediately replaces for anything Google has real
 * hours for; the auto-generated blurb (scripts/discover-places.ts) stays
 * until someone curates it by hand.
 */
const discoveredAsSeed: SeedSpot[] = discovered
  .filter((d): d is DiscoveredSpot & { coords: { lat: number; lng: number } } => d.coords !== null)
  .map((d) => ({ ...d, address: d.address ?? "", hours: OPEN_24H }));

const allSeed: SeedSpot[] = [...seed, ...discoveredAsSeed];
const DISCOVERED_IDS = new Set(discovered.map((d) => d.id));

export const SPOTS: Spot[] = allSeed.map((s) => {
  const e = ENRICHMENT[s.id];
  return {
    ...s,
    coords: e?.coords ?? s.coords,
    rating: e?.rating ?? s.rating,
    reviewCount: e?.reviewCount ?? s.reviewCount,
    phone: e?.phone ?? s.phone,
    address: e?.address ?? s.address,
    hours: e?.hours ?? s.hours,
    website: e?.website ?? null,
    bookingUrl: null, // TODO: real booking links (SPEC §12 Q3)
    photos: [], // TODO: real hosted images (SPEC §7); striped placeholder until then
    isDiscovered: DISCOVERED_IDS.has(s.id),
    updatedAt: e?.checkedAt ?? SEED_UPDATED_AT,
    googlePlaceId: e?.placeId ?? null,
  };
});

export const AREAS: Area[] = [
  { id: "blouberg", name: "Blouberg" },
  { id: "durbanville", name: "Durbanville" },
  { id: "waterfront", name: "V&A Waterfront" },
  { id: "bokaap", name: "Bo-Kaap" },
  { id: "citybowl", name: "City Bowl" },
  { id: "seapoint", name: "Sea Point" },
  { id: "campsbay", name: "Camps Bay" },
  { id: "tablemtn", name: "Table Mtn", hideLabel: true },
  { id: "woodstock", name: "Woodstock" },
  { id: "obs", name: "Observatory" },
  { id: "south", name: "Southern Subs" },
  { id: "constantia", name: "Constantia" },
  { id: "houtbay", name: "Hout Bay" },
  { id: "muizenberg", name: "Muizenberg" },
  { id: "winelands", name: "Winelands" },
  { id: "overberg", name: "Overberg" },
  { id: "westcoast", name: "West Coast" },
  { id: "gardenroute", name: "Garden Route" },
];

/**
 * Real-world anchor per area: the clickable filter marker on the browse map,
 * and the "nearest anchor" used by scripts/discover-places.ts to assign an
 * area to swept venues. Region anchors sit on their main town (Stellenbosch,
 * Hermanus, Langebaan, Wilderness).
 */
export const AREA_ANCHORS: Record<AreaId, { lat: number; lng: number }> = {
  blouberg: { lat: -33.808, lng: 18.4695 },
  durbanville: { lat: -33.8305, lng: 18.6501 },
  waterfront: { lat: -33.9036, lng: 18.4207 },
  bokaap: { lat: -33.9192, lng: 18.4135 },
  citybowl: { lat: -33.9258, lng: 18.4232 },
  seapoint: { lat: -33.915, lng: 18.385 },
  campsbay: { lat: -33.9508, lng: 18.3775 },
  tablemtn: { lat: -33.9628, lng: 18.4098 },
  woodstock: { lat: -33.9275, lng: 18.446 },
  obs: { lat: -33.9377, lng: 18.4713 },
  south: { lat: -33.981, lng: 18.465 },
  constantia: { lat: -34.027, lng: 18.42 },
  houtbay: { lat: -34.038, lng: 18.355 },
  muizenberg: { lat: -34.105, lng: 18.469 },
  winelands: { lat: -33.9346, lng: 18.861 },
  overberg: { lat: -34.4092, lng: 19.2504 },
  westcoast: { lat: -33.0987, lng: 18.0403 },
  gardenroute: { lat: -33.9931, lng: 22.5747 },
};

export const CATEGORIES: { key: Category | "free"; label: string }[] = [
  { key: "eat", label: "Restaurants & Cafés" },
  { key: "bars", label: "Bars & Nightlife" },
  { key: "outdoor", label: "Outdoors" },
  { key: "classes", label: "Classes" },
  { key: "chill", label: "Chill Spots" },
  { key: "arts", label: "Arts & Culture" },
  { key: "family", label: "Family" },
  { key: "free", label: "Free" },
];

export const COLLECTIONS: Collection[] = [
  {
    key: "lowkey",
    label: "Lowkey gems",
    desc: "Local favourites, low fuss",
    icon: "sparkles",
    spotIds: ["obscafe", "kalkfish", "signalhill", "bootlegger", "superette", "seapointprom"],
    paletteKey: "chill",
  },
  {
    key: "firstdate",
    label: "First-date spots",
    desc: "Easy charm, good light",
    icon: "heart",
    spotIds: ["kloof", "causeeffect", "sundowners", "pottery", "lionshead"],
    paletteKey: "bars",
  },
  {
    key: "free",
    label: "Free this weekend",
    desc: "Big days out, zero cost",
    icon: "gift",
    spotIds: null,
    paletteKey: "free",
  },
  {
    key: "rainy",
    label: "Rainy-day ideas",
    desc: "Great indoors",
    icon: "umbrella",
    spotIds: ["zeitz", "aquarium", "truth", "pottery", "capemalay", "obscafe"],
    paletteKey: "arts",
  },
  {
    key: "sunset",
    label: "Sunset sessions",
    desc: "Golden-hour magic",
    icon: "sunset",
    spotIds: ["lionshead", "sundowners", "signalhill", "seapointprom", "campsbeach", "bluepeter"],
    paletteKey: "eat",
  },
  {
    key: "family",
    label: "Family day out",
    desc: "Kid-approved",
    icon: "flower",
    spotIds: ["aquarium", "boulders", "constantiapicnic", "campsbeach", "biscuitmill", "doodles"],
    paletteKey: "family",
  },
];

/**
 * Adventure activities surfaced as Discover chips. Membership = the activity
 * tag appearing in Spot.tags; scripts/discover-places.ts `activity <key>`
 * sweeps the whole Western Cape for venues and stamps the tag on import.
 * Chips with zero matching spots stay hidden, so listing an activity here
 * before its sweep has run is harmless.
 */
export const ACTIVITIES: Activity[] = [
  { key: "quad", label: "Quad biking", tag: "quad biking" },
  { key: "paraglide", label: "Paragliding", tag: "paragliding" },
  { key: "kayak", label: "Kayaking", tag: "kayaking" },
  { key: "horse", label: "Horse riding", tag: "horse riding" },
  { key: "sandboard", label: "Sandboarding", tag: "sandboarding" },
  { key: "zipline", label: "Ziplining", tag: "ziplining" },
  { key: "sharks", label: "Shark cage diving", tag: "shark cage diving" },
  { key: "surf", label: "Surf lessons", tag: "learn to surf" },
  { key: "kite", label: "Kitesurfing", tag: "kitesurfing" },
  { key: "strawberries", label: "Strawberry picking", tag: "strawberry picking" },
  { key: "fruitpick", label: "Fruit picking", tag: "fruit picking" },
  { key: "flowerpick", label: "Flower picking", tag: "flower picking" },
];

export const INTERESTS: Interest[] = [
  { key: "eat", label: "Food & Coffee" },
  { key: "bars", label: "Nightlife" },
  { key: "outdoor", label: "Outdoors" },
  { key: "arts", label: "Arts & Culture" },
  { key: "classes", label: "Learning" },
  { key: "chill", label: "Lowkey" },
  { key: "family", label: "Family" },
  { key: "free", label: "Free stuff" },
];

/** Category accent pairs for striped photo placeholders (README tokens). */
export const CATEGORY_PALETTES: Record<string, [string, string]> = {
  eat: ["#cf6a3f", "#a94f28"],
  bars: ["#7a4b6b", "#59314d"],
  outdoor: ["#3f7d5c", "#2c5a41"],
  classes: ["#c58a3d", "#9c6a26"],
  chill: ["#5c7a8c", "#3f5a69"],
  arts: ["#a2593f", "#7d3f2c"],
  family: ["#5b8f7a", "#3f6b58"],
  free: ["#7d8452", "#5c623a"],
};
