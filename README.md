# Kaap — Cape Town Activity Guide

Mobile-first PWA for discovering things to do in Cape Town — restaurants, bars,
outdoor activities, classes, arts, family outings and lowkey local gems — with
Rand prices, live opening hours (SAST) and saveable lists.

Built from the design handoff in `plans/design_handoff_cape_town_guide`
(`SPEC.md` = product spec, `HANDOFF.md` = design doc; Phase 1 / MVP per
SPEC §3). Stack: **Next.js (App Router) + TypeScript + Tailwind CSS v4 +
Supabase**.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

No configuration needed — without Supabase credentials the app serves the
bundled curated seed data (23 spots). Other scripts:

```bash
npm test               # unit tests (SAST open-now logic)
npm run build          # production build
npm run seed:sql       # regenerate supabase/seed.sql from lib/data/spots.ts
npm run icons          # regenerate placeholder PWA icons
npm run places:match   # match spots to Google place IDs (needs PLACES_API_KEY)
npm run places:refresh # refresh hours/ratings/contact from Google Places
```

## Live data (Google Places)

Facts that go stale (hours, ratings, phone, website, precise coords) come from
the Google Places API via `scripts/enrich-places.ts`, overlaid onto the curated
seed in `lib/data/enrichment.json`. Curated voice (blurbs, price bands, tags)
is never overwritten. To refresh: set `PLACES_API_KEY` in `.env.local`, run
`npm run places:refresh`, then `npm run seed:sql` and re-run `seed.sql` if a
database is live (the seed upserts). Spot detail pages show a real MapLibre map
(OpenFreeMap tiles, keyless) plus "last checked" freshness per SPEC §8.

## Going live with Supabase (manual steps)

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then
   `supabase/seed.sql`.
3. Copy `.env.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Project Settings → API).
4. Restart the dev server — spots now come from Postgres
   (`lib/spots-repo.ts` logs a warning and falls back to seed data if the
   fetch fails).

## Deploying

Any Node host works; Vercel is the zero-config path:

1. Push the repo to GitHub and import it in Vercel (framework auto-detected).
2. Set the env vars from `.env.example`: the two Supabase keys, plus
   `NEXT_PUBLIC_SITE_URL` set to your production URL (drives the sitemap,
   robots.txt and OpenGraph metadata).
3. In Supabase → Auth → URL Configuration, add
   `https://your-domain/auth/callback` as a redirect URL so magic links and
   OAuth land back in the app.

## Where things live

- `lib/data/spots.ts` — canonical curated data (spots, areas, categories,
  collections, palettes). `seed.sql` is generated from it, so edit here.
- `lib/hours.ts` — structured weekly hours + open-now, always computed in
  `Africa/Johannesburg` (SPEC §6.3). Tested in `lib/hours.test.ts`.
- `lib/filters.ts` — AND-combining filter/sort/search rules.
- `lib/store.tsx` — guest-mode profile + saved spots (localStorage).
- `components/discover|spot|saved|profile|onboarding` — one folder per screen.
- `app/(main)` — app screens behind the shared header; `app/onboarding` is
  standalone.
- `public/sw.js` — service worker (registered in production builds only).

## Deliberate MVP placeholders (marked TODO in code)

- **Photos** — striped category-coloured blocks (`components/ui/StripedThumb.tsx`
  is the single swap point for real images).
- **Reviews** — sample content; provider ratings then first-party reviews come
  in P2/P3 (SPEC §6.4).
- **Auth** — Google/Apple buttons just start a guest session; real OAuth +
  saved-list sync is P2 (SPEC §5.1).
- **Distance** — real haversine distance, but only when the user grants
  location during onboarding; spot coords are approximate pending Places API
  enrichment (SPEC §7).
- **App icons** — generated brand-dot placeholders in `public/icons/`.
