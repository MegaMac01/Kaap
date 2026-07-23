/**
 * Google Places (New) enrichment for the curated spots (SPEC §7, §9).
 *
 * Three modes:
 *   npm run places:match    : find each spot's Google place_id (writes
 *                             lib/data/places-match.json; review it by hand!)
 *   npm run places:refresh  : pull live hours/rating/contact/coords for every
 *                             matched place into lib/data/enrichment.json,
 *                             which lib/data/spots.ts overlays onto the seed.
 *   npm run places:reviews  : pull each place's top Google reviews into
 *                             lib/data/reviews.json (bundled, shown on spot
 *                             pages with attribution). Separate mode because
 *                             the reviews field bills at a higher SKU than
 *                             the facts refresh.
 *
 * Needs PLACES_API_KEY in .env.local. Curated fields (blurb, price bands,
 * tags, categories) are never touched, only facts a provider knows better.
 * Google policy: cache max 30 days (place_id exempt), attribute ratings.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SPOTS } from "../lib/data/spots";
import { DAY_KEYS, type DayKey, type SpotReview, type WeeklyHours } from "../lib/types";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MATCH_FILE = join(ROOT, "lib", "data", "places-match.json");
const ENRICHMENT_FILE = join(ROOT, "lib", "data", "enrichment.json");
const REVIEWS_FILE = join(ROOT, "lib", "data", "reviews.json");

// Minimal .env.local loader (tsx does not load env files).
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

interface MatchEntry {
  placeId: string;
  googleName: string;
  address: string;
}

interface GooglePeriodPoint {
  day: number; // 0 = Sunday … 6 = Saturday
  hour: number;
  minute: number;
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  regularOpeningHours?: { periods?: { open: GooglePeriodPoint; close?: GooglePeriodPoint }[] };
}

export interface Enrichment {
  placeId: string;
  googleName: string;
  coords: { lat: number; lng: number } | null;
  rating: number | null;
  reviewCount: number | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  hours: WeeklyHours | null;
  checkedAt: string;
}

const hm = (p: GooglePeriodPoint) =>
  `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;

/** Google day (0=Sun) → our DayKey (DAY_KEYS starts at mon). */
const dayKey = (g: number): DayKey => (g === 0 ? "sun" : DAY_KEYS[g - 1]);

/** Convert Places period list to our per-day interval map (SPEC §6.3). */
function toWeeklyHours(periods: { open: GooglePeriodPoint; close?: GooglePeriodPoint }[]): WeeklyHours {
  const out = {} as WeeklyHours;
  DAY_KEYS.forEach((d) => (out[d] = []));
  // A single open point with no close means open 24/7.
  if (periods.length === 1 && !periods[0].close) {
    DAY_KEYS.forEach((d) => (out[d] = [{ open: "00:00", close: "24:00" }]));
    return out;
  }
  for (const p of periods) {
    if (!p.close) continue;
    const open = hm(p.open);
    // Midnight on the next day is "24:00" (end of day); a later next-day time
    // stays as-is: isOpenAt treats close < open as spanning midnight.
    const close =
      p.close.day !== p.open.day && p.close.hour === 0 && p.close.minute === 0
        ? "24:00"
        : hm(p.close);
    out[dayKey(p.open.day)].push({ open, close });
  }
  return out;
}

async function searchText(query: string): Promise<GooglePlace | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery: query,
      // Bias to the Cape Town metro so same-named venues elsewhere don't win.
      locationBias: {
        circle: { center: { latitude: -33.93, longitude: 18.46 }, radius: 40000 },
      },
    }),
  });
  if (!res.ok) throw new Error(`searchText ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { places?: GooglePlace[] };
  return data.places?.[0] ?? null;
}

async function placeDetails(placeId: string): Promise<GooglePlace> {
  const fields = [
    "id",
    "displayName",
    "formattedAddress",
    "location",
    "internationalPhoneNumber",
    "websiteUri",
    "rating",
    "userRatingCount",
    "businessStatus",
    "regularOpeningHours",
  ].join(",");
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: { "X-Goog-Api-Key": KEY!, "X-Goog-FieldMask": fields },
  });
  if (!res.ok) throw new Error(`placeDetails ${res.status}: ${await res.text()}`);
  return (await res.json()) as GooglePlace;
}

async function runMatch() {
  // An explicit null entry means "no Google entity, keep curated": never retry.
  const existing: Record<string, MatchEntry | null> = existsSync(MATCH_FILE)
    ? JSON.parse(readFileSync(MATCH_FILE, "utf8"))
    : {};
  for (const spot of SPOTS) {
    if (existing[spot.id] === null) {
      console.log(`- ${spot.id}: skipped (curated-only by choice)`);
      continue;
    }
    if (existing[spot.id]) {
      console.log(`= ${spot.id}: already matched (${existing[spot.id]!.googleName})`);
      continue;
    }
    const hit = await searchText(`${spot.name}, Cape Town, South Africa`);
    if (!hit) {
      console.warn(`✗ ${spot.id}: no result for "${spot.name}"`);
      continue;
    }
    const entry: MatchEntry = {
      placeId: hit.id,
      googleName: hit.displayName?.text ?? "",
      address: hit.formattedAddress ?? "",
    };
    existing[spot.id] = entry;
    console.log(`✓ ${spot.id}: ${entry.googleName} (${entry.address})`);
    await sleep(150);
  }
  writeFileSync(MATCH_FILE, JSON.stringify(existing, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${MATCH_FILE}`);
  console.log("Review the matches above; delete any wrong entry and re-run to retry it.");
}

async function runRefresh() {
  if (!existsSync(MATCH_FILE)) {
    console.error("No places-match.json: run `npm run places:match` first.");
    process.exit(1);
  }
  const matches: Record<string, MatchEntry | null> = JSON.parse(
    readFileSync(MATCH_FILE, "utf8")
  );
  const out: Record<string, Enrichment> = {};
  const checkedAt = new Date().toISOString().slice(0, 10);

  for (const spot of SPOTS) {
    const match = matches[spot.id];
    if (!match) {
      console.warn(`- ${spot.id}: unmatched, keeping curated data`);
      continue;
    }
    const p = await placeDetails(match.placeId);
    if (p.businessStatus && p.businessStatus !== "OPERATIONAL") {
      console.warn(`! ${spot.id}: businessStatus=${p.businessStatus}, review this spot`);
    }
    const periods = p.regularOpeningHours?.periods;
    out[spot.id] = {
      placeId: p.id,
      googleName: p.displayName?.text ?? match.googleName,
      coords: p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null,
      rating: p.rating ?? null,
      reviewCount: p.userRatingCount ?? null,
      phone: p.internationalPhoneNumber ?? null,
      website: p.websiteUri ?? null,
      address: p.formattedAddress?.replace(/, South Africa$/, "") ?? null,
      hours: periods?.length ? toWeeklyHours(periods) : null,
      checkedAt,
    };
    console.log(
      `✓ ${spot.id}: rating ${out[spot.id].rating ?? "–"} (${out[spot.id].reviewCount ?? 0}), ` +
        `${out[spot.id].hours ? "hours ok" : "no hours (curated kept)"}`
    );
    await sleep(150);
  }

  writeFileSync(ENRICHMENT_FILE, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${ENRICHMENT_FILE}`);
  console.log("Now run `npm run seed:sql` so the DB seed picks up the fresh data.");
}

interface GoogleReview {
  rating?: number;
  relativePublishTimeDescription?: string;
  text?: { text?: string };
  authorAttribution?: { displayName?: string };
}

/** Trim to a sentence-ish cutoff so one rambling review can't swallow the page. */
function trimReview(text: string, max = 340): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return lastStop > max * 0.5 ? cut.slice(0, lastStop + 1) : cut.trimEnd() + "…";
}

async function placeReviews(placeId: string): Promise<GoogleReview[]> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: { "X-Goog-Api-Key": KEY!, "X-Goog-FieldMask": "id,reviews" },
  });
  if (!res.ok) throw new Error(`placeReviews ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { reviews?: GoogleReview[] };
  return data.reviews ?? [];
}

async function runReviews() {
  if (!existsSync(MATCH_FILE)) {
    console.error("No places-match.json: run `npm run places:match` first.");
    process.exit(1);
  }
  const matches: Record<string, MatchEntry | null> = JSON.parse(
    readFileSync(MATCH_FILE, "utf8")
  );
  const out: Record<string, SpotReview[]> = {};
  for (const spot of SPOTS) {
    const match = matches[spot.id];
    if (!match) continue;
    let raw: GoogleReview[];
    try {
      raw = await placeReviews(match.placeId);
    } catch (err) {
      console.warn(`! ${spot.id}: ${(err as Error).message}`);
      continue;
    }
    const reviews = raw
      .filter((r) => r.text?.text && r.rating != null)
      .slice(0, 3)
      .map((r) => ({
        author: r.authorAttribution?.displayName ?? "A Google user",
        rating: Math.round(r.rating!),
        when: r.relativePublishTimeDescription ?? "",
        text: trimReview(r.text!.text!),
      }));
    if (reviews.length) out[spot.id] = reviews;
    console.log(`✓ ${spot.id}: ${reviews.length} reviews`);
    await sleep(120);
  }
  writeFileSync(REVIEWS_FILE, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${REVIEWS_FILE} (${Object.keys(out).length} spots with reviews).`);
}

async function main() {
  const mode = process.argv[2];
  if (mode === "match") await runMatch();
  else if (mode === "refresh") await runRefresh();
  else if (mode === "reviews") await runReviews();
  else {
    console.error("Usage: tsx scripts/enrich-places.ts <match|refresh|reviews>");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
