-- Kaap — Google Places enrichment (SPEC §7): stable place_id per spot.
-- place_id is exempt from Google's 30-day caching limit; other enriched fields
-- are refreshed by scripts/enrich-places.ts + seed.sql re-runs.

alter table public.spots add column google_place_id text;
